// components/WhatsAppHeader.tsx
import React, { useState, useEffect } from "react";
import { Phone } from "lucide-react"; // آپ کے پاس پہلے سے موجود ہے

export default function WhatsAppHeader() {
  const [number, setNumber] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // وہی پبلک API جو ہم نے پچھلی بار بنایا تھا
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => {
        setNumber(data.whatsapp_number || "");
        setMessage(data.whatsapp_message || "Assalam-o-Alaikum! مجھے مدد چاہیے۔");
      })
      .catch(() => {});
  }, []);

  // اگر ایڈمن نے نمبر سیٹ نہیں کیا تو بٹن غائب رہے گا
  if (!number) return null;

  const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all duration-200 text-sm font-medium"
    >
      <Phone className="w-4 h-4" />
      <span className="hidden sm:inline">Support</span>
    </a>
  );
                   }
