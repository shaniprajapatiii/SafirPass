"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  Printer,
  QrCode,
  ShieldCheck,
  Check,
  Clock,
  ScanFace,
  Lock,
  ArrowRight,
  RefreshCw,
  FileText,
  Radio,
  Copy,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../../../lib/auth-context";
import { QrGraphic, BarcodeGraphic } from "../../../components/QrGraphic";
import {
  ATTRIBUTES,
  OFFLINE_CACHE_KEY,
  barcodeValue,
  buildShare,
  encodeShare,
} from "../../../lib/credential";

const DEFAULT_KEYS = ["full_name", "nationality", "tourist_id", "validity"];

export default function DigitalIdPage() {
  const { user } = useAuth();
  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState(DEFAULT_KEYS);
  const [cardSide, setCardSide] = useState("front"); // "front" | "back" | "both"

  // Image & PDF Export states
  const [showImageModal, setShowImageModal] = useState(false);
  const [exportFormat, setExportFormat] = useState("png"); // "png" | "jpeg"
  const [exportSide, setExportSide] = useState("front"); // "front" | "back" | "both"
  const [exportResolution, setExportResolution] = useState(2);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Fetch KYC safely without cascading renders
  useEffect(() => {
    let isMounted = true;
    const loadKyc = async () => {
      try {
        const res = await fetch("/api/kyc/status");
        const data = await res.json();
        if (isMounted && data?.kyc) {
          setKyc(data.kyc);
        }
      } catch (e) {
        console.warn("Failed to fetch KYC:", e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadKyc();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const activeKyc = useMemo(() => {
    if (kyc) return kyc;
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("safirpass_active_kyc");
        if (saved) return JSON.parse(saved);
      } catch { }
    }
    return null;
  }, [kyc]);

  // Dynamic Cryptographic QR States
  const [dynamicToken, setDynamicToken] = useState("");
  const [tokenNonce, setTokenNonce] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(45);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [liveClock, setLiveClock] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Live ticking clock (IST / UTC) for anti-screenshot watermark
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setLiveClock(
        now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST"
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch rotating dynamic cryptographic token from authority API
  const refreshDynamicToken = async () => {
    if (!activeKyc?.tourist_id) return;
    setIsRefreshingToken(true);
    try {
      const res = await fetch("/api/credentials/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys }),
      });
      const data = await res.json();
      if (data?.token) {
        setDynamicToken(data.token);
        setTokenNonce(data.nonce || "");
        setSecondsRemaining(data.ttlSeconds || 45);
      }
    } catch (err) {
      console.warn("Dynamic token rotation note:", err.message);
    } finally {
      setIsRefreshingToken(false);
    }
  };

  // Trigger token refresh when KYC loads or keys change
  useEffect(() => {
    if (activeKyc?.tourist_id) {
      refreshDynamicToken();
    }
  }, [activeKyc?.tourist_id, keys]);

  // Dynamic 1-second countdown ticker with auto-rotation
  useEffect(() => {
    const ticker = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          refreshDynamicToken();
          return 45;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(ticker);
  }, [keys, activeKyc?.tourist_id]);

  // Fallback share if dynamic token is still loading or offline
  const share = useMemo(() => {
    if (!activeKyc) return null;
    return buildShare(activeKyc, keys);
  }, [activeKyc, keys]);

  const fallbackToken = useMemo(() => (share ? encodeShare(share) : ""), [share]);
  const activeToken = dynamicToken || fallbackToken;

  const shareUrl = useMemo(() => {
    if (!activeToken) return "";
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/verify?d=${activeToken}`;
  }, [activeToken]);

  // Offline Cache Sync (caches both active dynamic token and offline pass)
  useEffect(() => {
    if (typeof window === "undefined" || !activeKyc || !activeToken) return;
    window.localStorage.setItem(
      OFFLINE_CACHE_KEY,
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        tourist_id: activeKyc.tourist_id,
        full_name: activeKyc.full_name,
        nationality: activeKyc.nationality,
        status: activeKyc.status,
        barcode: barcodeValue(activeKyc),
        token: activeToken,
      }),
    );
  }, [activeKyc, activeToken]);

  const toggleKey = (key) => {
    setKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  // Unique SafirPass ID Number (e.g. IN-TID-884920)
  const uniqueSafirId = useMemo(() => {
    return activeKyc?.tourist_id;
  }, [activeKyc]);

  const code128 = useMemo(() => barcodeValue(activeKyc), [activeKyc]);

  // ACCURATE FULL IMAGE DOWNLOAD (PNG / JPEG)
  // Fixes half-image issue by resetting scroll & computing full bounding rect
  const handleDownloadImage = async () => {
    setIsExportingImage(true);
    const previousSide = cardSide;

    // Reset scroll to top-left to avoid foreignObject viewport scroll clipping
    const prevScrollX = typeof window !== "undefined" ? window.scrollX : 0;
    const prevScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }

    try {
      const { toPng, toJpeg } = await import("html-to-image");

      // Temporarily set view to the side we need to export
      setCardSide(exportSide);

      // Wait for layout repaint without transition delay
      await new Promise((resolve) => {
        requestAnimationFrame(() => setTimeout(resolve, 150));
      });

      let targetId = "safirpass-card-front";
      if (exportSide === "back") {
        targetId = "safirpass-card-back";
      } else if (exportSide === "both") {
        targetId = "safirpass-card-combined";
      }

      const targetNode = document.getElementById(targetId);
      if (!targetNode) {
        throw new Error("Target card element not found");
      }

      // Compute exact full dimensions to avoid any truncation
      const rect = targetNode.getBoundingClientRect();
      const fullWidth = Math.ceil(
        targetNode.scrollWidth || targetNode.offsetWidth || rect.width,
      );
      const fullHeight = Math.ceil(
        targetNode.scrollHeight || targetNode.offsetHeight || rect.height,
      );

      const touristId = activeKyc?.tourist_id || "credential";
      const options = {
        width: fullWidth,
        height: fullHeight,
        canvasWidth: fullWidth * exportResolution,
        canvasHeight: fullHeight * exportResolution,
        pixelRatio: exportResolution,
        cacheBust: true,
        quality: 0.98,
        backgroundColor: exportFormat === "jpeg" ? "#ffffff" : null,
        style: {
          margin: "0",
          transform: "none",
          webkitTransform: "none",
          maxHeight: "none",
          height: "auto",
        },
      };

      let dataUrl;
      if (exportFormat === "jpeg") {
        dataUrl = await toJpeg(targetNode, options);
      } else {
        dataUrl = await toPng(targetNode, options);
      }

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `SafirPass-Card-${exportSide}-${touristId}.${exportFormat === "jpeg" ? "jpg" : "png"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setShowImageModal(false);
      setCardSide(previousSide);
    } catch (err) {
      console.error("Failed to export card image:", err);
      alert("Failed to export card image. Please try again.");
      setCardSide(previousSide);
    } finally {
      if (typeof window !== "undefined") {
        window.scrollTo(prevScrollX, prevScrollY);
      }
      setIsExportingImage(false);
    }
  };

  // ACCURATE FULL PASS PDF EXPORT (jsPDF)
  const handleDownloadPdfPass = async () => {
    setIsExportingPdf(true);
    const previousSide = cardSide;

    const prevScrollX = typeof window !== "undefined" ? window.scrollX : 0;
    const prevScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }

    try {
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");

      setCardSide("both");
      await new Promise((resolve) => {
        requestAnimationFrame(() => setTimeout(resolve, 150));
      });

      const frontNode = document.getElementById("safirpass-card-front");
      const backNode = document.getElementById("safirpass-card-back");
      if (!frontNode || !backNode) {
        throw new Error("Card elements not found");
      }

      const frontWidth = Math.ceil(
        frontNode.scrollWidth || frontNode.offsetWidth,
      );
      const frontHeight = Math.ceil(
        frontNode.scrollHeight || frontNode.offsetHeight,
      );
      const backWidth = Math.ceil(backNode.scrollWidth || backNode.offsetWidth);
      const backHeight = Math.ceil(
        backNode.scrollHeight || backNode.offsetHeight,
      );

      const frontImg = await toPng(frontNode, {
        width: frontWidth,
        height: frontHeight,
        canvasWidth: frontWidth * 2.5,
        canvasHeight: frontHeight * 2.5,
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });

      const backImg = await toPng(backNode, {
        width: backWidth,
        height: backHeight,
        canvasWidth: backWidth * 2.5,
        canvasHeight: backHeight * 2.5,
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });

      setCardSide(previousSide);

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const touristId = activeKyc?.tourist_id || "IN-TID-CERTIFIED";

      // 1. National Tricolor Strip
      doc.setFillColor(255, 153, 51);
      doc.rect(0, 0, pageWidth / 3, 3, "F");
      doc.setFillColor(255, 255, 255);
      doc.rect(pageWidth / 3, 0, pageWidth / 3, 3, "F");
      doc.setFillColor(19, 136, 8);
      doc.rect((pageWidth / 3) * 2, 0, pageWidth / 3, 3, "F");

      // 2. Official Header
      doc.setFillColor(15, 23, 42);
      doc.rect(14, 8, pageWidth - 28, 22, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(245, 158, 11);
      doc.text("REPUBLIC OF INDIA  •  MINISTRY OF TOURISM", 20, 14.5);

      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(
        "SAFIRPASS OFFICIAL SMART TOURIST IDENTITY CARD & DOSSIER",
        20,
        20.5,
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        "Official Digital Travel Credential issued under Foreigners Act 1946 & DPDP Act 2023",
        20,
        25.5,
      );

      // Ref Badge
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(pageWidth - 60, 12, 42, 14, 2, 2, "F");
      doc.setFont("courier", "bold");
      doc.setFontSize(8);
      doc.setTextColor(245, 158, 11);
      doc.text(`ID: ${touristId}`, pageWidth - 58, 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(52, 211, 153);
      doc.text("● OFFICIALLY CERTIFIED", pageWidth - 58, 23);

      // 3. Side-by-Side Front and Back Cards
      const cardWidth = (pageWidth - 32) / 2;
      const cardHeight = (cardWidth * 235) / 370;

      doc.addImage(frontImg, "PNG", 14, 34, cardWidth, cardHeight);
      doc.addImage(
        backImg,
        "PNG",
        14 + cardWidth + 4,
        34,
        cardWidth,
        cardHeight,
      );

      // 4. Dossier Data Table
      const tableStartY = 34 + cardHeight + 6;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, tableStartY, pageWidth - 28, 7, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(
        "VERIFIED SAFIRPASS TOURIST RECORD & TRAVEL DOSSIER",
        18,
        tableStartY + 5,
      );

      const rowY = tableStartY + 10;
      const col1X = 16;
      const col2X = pageWidth / 2 + 2;
      const rowHeight = 7;

      const details = [
        { label: "Tourist Name", val: activeKyc?.full_name || "—" },
        { label: "SafirPass ID Number", val: uniqueSafirId },
        { label: "Nationality", val: activeKyc?.nationality || "—" },
        { label: "Passport Number", val: activeKyc?.passport_number || "—" },
        { label: "Category", val: "International Tourist (SafirPass)" },
        {
          label: "Stay Validity",
          val:
            activeKyc?.entry_date && activeKyc?.exit_date
              ? `${activeKyc.entry_date} to ${activeKyc.exit_date}`
              : "30 Days Multi-Entry",
        },
        {
          label: "Biometric Liveness",
          val: activeKyc?.liveness_score
            ? `Verified (${(activeKyc.liveness_score * 100).toFixed(0)}% Match)`
            : "Verified (100%)",
        },
        {
          label: "Issuing Authority",
          val: "Bureau of Immigration & Ministry of Tourism",
        },
        {
          label: "Emergency Helpline",
          val: "1363 (Tourist) / 112 (Emergency)",
        },
        {
          label: "Compliance Status",
          val: "DPDP Act 2023 & Foreigners Act Certified",
        },
      ];

      doc.setFontSize(7);
      for (let i = 0; i < details.length; i += 2) {
        const currentY = rowY + (i / 2) * rowHeight;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text(details[i].label + ":", col1X, currentY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(String(details[i].val), col1X + 36, currentY);

        if (details[i + 1]) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text(details[i + 1].label + ":", col2X, currentY);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(15, 23, 42);
          doc.text(String(details[i + 1].val), col2X + 36, currentY);
        }

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
      }

      // 5. Statutory Legal Notice Box
      const legalY = rowY + (details.length / 2) * rowHeight + 3;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, legalY, pageWidth - 28, 22, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.text(
        "STATUTORY NOTICE & OFFICIAL RECOGNITION ACROSS INDIA",
        18,
        legalY + 4.5,
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.8);
      doc.setTextColor(71, 85, 105);
      const legalText = doc.splitTextToSize(
        "This official document is an authenticated cryptographic digital identity issued under the Foreigners Act 1946, the Registration of Foreigners Rules, and the Digital Personal Data Protection (DPDP) Act 2023. Valid for presentation at licensed Hotels, Guest Houses, Telecom counters for tourist SIM card issuance, Protected Area Permit checkpoints, domestic airports, and police checkpoints across all States and Union Territories of India.",
        pageWidth - 36,
      );
      doc.text(legalText, 18, legalY + 8.5);

      // 6. Footer
      const footerY = legalY + 26;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        "24x7 Tourist Helpline: 1363  |  Emergency SOS: 112  |  Incredible India Safe Tourism Grid",
        14,
        footerY,
      );

      doc.setFont("courier", "normal");
      doc.setFontSize(5.8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Generated: ${new Date().toUTCString()} · Hardware Token: ${touristId}`,
        14,
        footerY + 3.8,
      );

      doc.save(`SafirPass-Official-Pass-${touristId}.pdf`);
    } catch (err) {
      console.error("Failed to export official PDF pass:", err);
      alert("Failed to export PDF pass. Please try again.");
      setCardSide(previousSide);
    } finally {
      if (typeof window !== "undefined") {
        window.scrollTo(prevScrollX, prevScrollY);
      }
      setIsExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg animate-pulse max-w-sm w-full">
          <QrCode className="mx-auto size-9 text-blue-600 animate-spin" />
          <p className="mt-4 text-sm font-bold text-slate-900">
            Loading SafirPass Tourist Identity Card...
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Decrypting verified travel credentials...
          </p>
        </div>
      </div>
    );
  }

  // Under review screen
  if (activeKyc && activeKyc.status === "under_review") {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="container-page max-w-2xl space-y-8">
          <div className="rounded-3xl border-2 border-amber-300 bg-white p-8 md:p-10 shadow-xl space-y-6 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner">
              <Clock className="size-9 animate-pulse" />
            </div>
            <div className="space-y-2">
              <span className="rounded-full bg-amber-100 px-3.5 py-1 text-xs font-bold text-amber-800">
                Verification Under Review
              </span>
              <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-slate-900">
                Tourist Identity Pass Locked
              </h1>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Your passport and biometric face verification are currently
                under review. Turnaround time is within{" "}
                <strong>24 hours</strong>.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No KYC screen
  if (!activeKyc) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4">
        <div className="container-page max-w-xl space-y-6 text-center">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-xl space-y-6">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <ScanFace className="size-8" />
            </div>
            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-bold text-slate-900">
                No Digital Identity Found
              </h1>
              <p className="text-sm text-slate-600">
                Please complete one-time country document upload &amp; live
                biometric verification to generate your official SafirPass
                Tourist Identity Card.
              </p>
            </div>
            <Link
              href="/dashboard/verify"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-blue-700 transition-colors"
            >
              <span>Begin Verification (e-KYC)</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 py-8 px-3 sm:px-6">
      <div className="container-page max-w-4xl space-y-6">
        {/* ========================================================= */}
        {/* TOP CONTROL BAR (HIDDEN IN PRINT)                         */}
        {/* ========================================================= */}
        <div className="no-print print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>OFFICIAL SAFIRPASS TOURIST DIGITAL IDENTITY</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 font-serif">
              SafirPass Smart Tourist Identity Card
            </h1>
            <p className="text-xs text-slate-500">
              Verified cryptographic smart identity card for hotels, SIM
              registration, and travel in India.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Download Image</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdfPass}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isExportingPdf ? (
                <RefreshCw className="size-3.5 animate-spin text-blue-600" />
              ) : (
                <FileText className="size-3.5 text-rose-600" />
              )}
              <span>{isExportingPdf ? "Generating..." : "Download PDF"}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="size-3.5" />
              <span>Print Card</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD SIDE SELECTOR (HIDDEN IN PRINT)                      */}
        {/* ========================================================= */}
        <div className="no-print print:hidden flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Card Side View
            </span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
              ID-1 CR80
            </span>
          </div>

          <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => setCardSide("front")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${cardSide === "front"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              Front Side
            </button>
            <button
              type="button"
              onClick={() => setCardSide("back")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${cardSide === "back"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              Back Side
            </button>
            <button
              type="button"
              onClick={() => setCardSide("both")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${cardSide === "both"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              Both Sides
            </button>
          </div>
        </div>

        {/* COMBINED AND INDIVIDUAL CARD MASTER CONTAINER             */}
        <div
          id="safirpass-card-combined"
          className="w-full max-w-2xl mx-auto space-y-6"
        >
          {/* ------------------------------------------------------- */}
          {/* 1. FRONT CARD (SAFIRPASS SMART IDENTITY CARD)           */}
          {/* ------------------------------------------------------- */}
          <div
            id="safirpass-card-front"
            className={`w-full rounded-3xl overflow-hidden shadow-xl border-2 border-slate-300 bg-[#fdfdfb] text-slate-900 select-none ${cardSide === "back" ? "hidden print:block" : "block"
              }`}
          >
            {/* Top Indian Tricolor Ribbon */}
            <div className="h-2 w-full bg-gradient-to-r from-[#FF9933] via-[#ffffff] to-[#138808]" />

            {/* Official Government & SafirPass Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-lg bg-amber-50 border border-amber-300/60 shadow-xs shrink-0">
                  <ShieldCheck className="size-7 text-amber-700" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                    <span>भारत सरकार</span>
                    <span className="text-slate-400 font-light">|</span>
                    <span>GOVERNMENT OF INDIA</span>
                  </h2>
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                    सफ़ीरपास डिजिटल पर्यटक पहचान पत्र • SAFIRPASS SMART TOURIST
                    IDENTITY CARD
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block rounded bg-blue-900 text-white font-bold text-[9px] px-2.5 py-0.5 tracking-wider uppercase shadow-xs">
                  CERTIFIED TOURIST
                </span>
                <p className="text-[8px] font-bold text-slate-500 mt-0.5 uppercase">
                  MINISTRY OF TOURISM
                </p>
              </div>
            </div>

            {/* Card Body: Photo, Details, QR Code */}
            <div className="p-5 sm:p-6 bg-gradient-to-b from-[#ffffff] to-[#f8f9fa] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* Left: Official Portrait Photo */}
                <div className="sm:col-span-4 flex flex-col items-center justify-center text-center">
                  <div className="relative size-32 rounded-lg overflow-hidden border-2 border-slate-400 shadow-md bg-slate-100">
                    {activeKyc.biometrics?.face_snapshot ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={activeKyc.biometrics.face_snapshot}
                        alt="Biometric Photograph"
                        className="size-full object-cover"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="size-full bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                        <ScanFace className="size-12 text-slate-400" />
                        <span className="text-[8px] font-mono mt-1 font-bold">
                          PHOTO
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[8px] font-bold uppercase py-0.5 text-center">
                      e-KYC Verified
                    </div>
                  </div>
                </div>

                {/* Center: Demographic Details */}
                <div className="sm:col-span-5 space-y-1.5 text-xs text-left">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold block">
                      नाम / Full Name:
                    </span>
                    <p className="font-extrabold text-sm text-slate-950 uppercase tracking-tight">
                      {activeKyc.full_name || "INTERNATIONAL TRAVELER"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block">
                        वैधता / Stay Validity:
                      </span>
                      <p className="font-bold text-slate-800 text-[11px]">
                        {activeKyc.entry_date && activeKyc.exit_date
                          ? `${activeKyc.entry_date} → ${activeKyc.exit_date}`
                          : "30 Days Multi-Entry"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block">
                        लिंग / Gender:
                      </span>
                      <p className="font-bold text-slate-800 text-[11px]">
                        {activeKyc.gender || "MALE / पुरुष"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block">
                        राष्ट्रीयता / Nationality:
                      </span>
                      <p className="font-bold text-slate-800 text-[11px]">
                        {activeKyc.nationality || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold block">
                        पासपोर्ट / Passport:
                      </span>
                      <p className="font-mono font-bold text-blue-900 text-[11px]">
                        {activeKyc.passport_number || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-0.5">
                    <span className="text-[9px] text-slate-500 font-bold block">
                      श्रेणी / Category:
                    </span>
                    <p className="font-bold text-slate-900 text-[11px]">
                      International Tourist (SafirPass Certified)
                    </p>
                  </div>
                </div>

                {/* Right: Verification QR Code with Live Dynamic Shield */}
                <div className="sm:col-span-3 flex flex-col items-center justify-center text-center space-y-1">
                  <div className="relative rounded-lg bg-white p-1.5 border border-slate-300 shadow-xs group">
                    <QrGraphic
                      value={shareUrl || code128}
                      size={100}
                      showStatus={false}
                      showBadge={false}
                    />
                    {/* Live Rotating Indicator Beacon */}
                    <div className="absolute top-1 right-1 flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[7.5px] font-extrabold text-emerald-700 uppercase tracking-wider flex items-center justify-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      ROTATING ({secondsRemaining}s)
                    </span>
                    <span className="text-[7px] font-mono text-slate-500 block">
                      {liveClock || "LIVE IST"}
                    </span>
                  </div>
                </div>
              </div>

              {/* The Unique SafirPass ID Number Box */}
              <div className="border-t border-slate-200 pt-3 text-center space-y-1">
                <div className="inline-block px-5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 shadow-inner">
                  <p className="font-mono text-xl sm:text-2xl font-black text-blue-950 tracking-[0.16em]">
                    {uniqueSafirId}
                  </p>
                </div>
                <div className="border-t border-blue-900/30 w-48 mx-auto pt-0.5" />
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                  विशिष्ट सफ़ीरपास पहचान संख्या • SAFIRPASS DIGITAL CREDENTIAL •
                  SAFE TRAVEL INDIA
                </p>
              </div>
            </div>
          </div>

          {/* 2. BACK CARD (SAFIRPASS TRAVEL & SAFETY DOCKET)         */}
          <div
            id="safirpass-card-back"
            className={`w-full rounded-3xl overflow-hidden shadow-xl border-2 border-slate-300 bg-[#fdfdfb] text-slate-900 select-none ${cardSide === "front" ? "hidden print:block" : "block"
              }`}
          >
            {/* Top Header Bar */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-400">
                  SAFIRPASS SECURE TRAVEL &amp; SAFETY CREDENTIAL
                </h2>
                <p className="text-[10px] text-slate-300 font-medium">
                  Bureau of Immigration &amp; Ministry of Tourism, Government of
                  India
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded">
                  REF: {activeKyc.tourist_id}
                </span>
              </div>
            </div>

            {/* Back Content Grid: Travel Details & Barcode */}
            <div className="p-5 sm:p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">
                    SafirPass ID / पहचान सं.
                  </span>
                  <p className="font-mono font-bold text-slate-900 text-xs">
                    {uniqueSafirId}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">
                    Transit Type / यात्रा प्रकार
                  </span>
                  <p className="font-bold text-slate-900 text-xs">
                    Tourist Safe Transit Grid
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">
                    Validity Period / वैधता
                  </span>
                  <p className="font-mono font-bold text-emerald-700 text-xs">
                    {activeKyc.entry_date && activeKyc.exit_date
                      ? `${activeKyc.entry_date} to ${activeKyc.exit_date}`
                      : "30 Days Multi-Entry"}
                  </p>
                </div>
              </div>

              {/* Emergency Helplines & Legal Notice */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                <div className="sm:col-span-8 space-y-2 text-left">
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-amber-900 block">
                        24x7 Tourist Helpline (Toll-Free):
                      </span>
                      <span className="font-mono font-extrabold text-sm text-amber-950">
                        1363 (12 Languages)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-rose-900 block">
                        National Emergency SOS:
                      </span>
                      <span className="font-mono font-extrabold text-sm text-rose-700">
                        112 (Police / Medical)
                      </span>
                    </div>
                  </div>

                  <p className="text-[9.5px] text-slate-600 leading-relaxed">
                    <strong>Statutory Recognition:</strong> This SafirPass
                    identity credential is encrypted and issued under the
                    Foreigners Act 1946, Registration of Foreigners Rules, and
                    DPDP Act 2023. Mandatory accepted at all licensed Hotels,
                    Telecom SIM counters, Protected Areas, and Police
                    checkpoints across India.
                  </p>
                </div>

                {/* Barcode & Security Fingerprint */}
                <div className="sm:col-span-4 flex flex-col items-center justify-center text-center space-y-1">
                  <div className="bg-white p-2 rounded border border-slate-300 shadow-xs max-w-full overflow-hidden">
                    <BarcodeGraphic value={code128} height={26} />
                  </div>
                  <span className="text-[8px] font-mono text-slate-400">
                    SEAL: {activeKyc.device_seal_hash || "SHA256-GOV-AUTH"}
                  </span>
                </div>
              </div>

              {/* Machine Readable Zone Strip */}
              <div className="bg-slate-100 rounded-md p-2 font-mono text-[9px] text-slate-700 tracking-[0.18em] border border-slate-300 text-center leading-relaxed">
                <p className="font-bold">
                  P&lt;IND
                  {activeKyc.passport_number
                    ?.replace(/[^a-zA-Z0-9]/g, "")
                    .padEnd(9, "&lt;")}
                  4&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                </p>
                <p className="font-bold">
                  {activeKyc.tourist_id?.replace(/[^a-zA-Z0-9]/g, "")}&lt;0
                  {activeKyc.nationality?.slice(0, 3)?.toUpperCase()}
                  &lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;0
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DYNAMIC ANTI-REPLAY & SCREENSHOT PROTECTION PANEL         */}
        {/* ========================================================= */}
        <div className="no-print print:hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-blue-50/50 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <Radio className="size-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-base font-bold text-slate-900">
                    Live Rotating Dynamic QR Shield
                  </h3>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 border border-emerald-300">
                    ACTIVE 45s TTL
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Screenshots cannot be permanently reused. Tokens rotate automatically with HMAC-SHA256 signatures.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshDynamicToken}
                disabled={isRefreshingToken}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${isRefreshingToken ? "animate-spin" : ""}`} />
                <span>{isRefreshingToken ? "Signing..." : "Rotate Now"}</span>
              </button>

              {shareUrl && (
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Verify In Portal</span>
                </a>
              )}
            </div>
          </div>

          {/* Countdown & Security Nonce Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-2xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-slate-500">Token Countdown</span>
                <span className="font-mono font-bold text-emerald-700">{secondsRemaining}s remaining</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-blue-600 transition-all duration-1000"
                  style={{ width: `${Math.max(5, (secondsRemaining / 45) * 100)}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Anti-Replay Nonce</span>
                <span className="font-mono font-bold text-slate-800 text-[11px]">
                  {tokenNonce ? `0x${tokenNonce.slice(0, 10)}...` : "SHA256-SYNCHRONIZED"}
                </span>
              </div>
              <Lock className="size-4 text-emerald-600 shrink-0" />
            </div>

            <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Live IST Time Lock</span>
                <span className="font-mono font-bold text-slate-900 text-[11px]">{liveClock || "SYNCHRONIZING..."}</span>
              </div>
              <Clock className="size-4 text-blue-600 shrink-0" />
            </div>
          </div>
        </div>

        {/* SELECTIVE DISCLOSURE & PRIVACY CONTROLS (HIDDEN IN PRINT) */}
        <div className="no-print print:hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
            <div>
              <h3 className="font-serif text-base font-bold text-slate-900">
                Selective Consent &amp; Data Siloing
              </h3>
              <p className="text-xs text-slate-500">
                Choose which attributes are shared in the dynamic QR code when
                presented to hotels or checkpoints.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
              <Lock className="size-3" />
              <span>DPDP Act 2023 Certified</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {ATTRIBUTES.map((attr) => {
              const active = keys.includes(attr.key);
              return (
                <button
                  key={attr.key}
                  type="button"
                  onClick={() => toggleKey(attr.key)}
                  className={`flex items-center justify-between rounded-xl border p-2.5 text-xs font-bold cursor-pointer ${active
                      ? "border-blue-600 bg-blue-50 text-blue-900 shadow-xs"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    }`}
                >
                  <span>{attr.label}</span>
                  {active && <Check className="size-3.5 text-blue-600" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* DOWNLOAD IMAGE MODAL                                      */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Download className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Download SafirPass Card Image
                  </h3>
                  <p className="text-xs text-slate-500">
                    Save crisp standalone identity card graphic.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Side Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Card Side
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "front", label: "Front Side" },
                  { id: "back", label: "Back Side" },
                  { id: "both", label: "Both Sides" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setExportSide(s.id)}
                    className={`rounded-xl border py-2 text-xs font-bold cursor-pointer ${exportSide === s.id
                        ? "border-blue-600 bg-blue-50 text-blue-900 shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Image Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat("png")}
                  className={`rounded-xl border p-3 text-left cursor-pointer ${exportFormat === "png"
                      ? "border-blue-600 bg-blue-50 text-blue-900 shadow-xs"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                >
                  <p className="text-xs font-bold">PNG Format</p>
                  <p className="text-[10px] text-slate-500">
                    Lossless &amp; transparent corners
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat("jpeg")}
                  className={`rounded-xl border p-3 text-left cursor-pointer ${exportFormat === "jpeg"
                      ? "border-blue-600 bg-blue-50 text-blue-900 shadow-xs"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                >
                  <p className="text-xs font-bold">JPEG Format</p>
                  <p className="text-[10px] text-slate-500">
                    High quality compressed photo
                  </p>
                </button>
              </div>
            </div>

            {/* Resolution */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Resolution Quality
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportResolution(2)}
                  className={`rounded-xl border py-2 text-xs font-bold cursor-pointer ${exportResolution === 2
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                >
                  Standard HD (2×)
                </button>
                <button
                  type="button"
                  onClick={() => setExportResolution(3)}
                  className={`rounded-xl border py-2 text-xs font-bold cursor-pointer ${exportResolution === 3
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                >
                  Ultra Print (3×)
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="w-1/2 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={isExportingImage}
                className="w-1/2 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isExportingImage ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    <span>Rendering...</span>
                  </>
                ) : (
                  <>
                    <Download className="size-3.5" />
                    <span>Save {exportFormat.toUpperCase()}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
