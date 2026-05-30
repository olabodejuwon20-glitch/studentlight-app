import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/contact";

export default function WhatsAppFab() {
  return (
    <a
      href={waLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-success text-success-foreground shadow-lg hover:shadow-xl transition-shadow px-4 py-3 text-sm font-semibold"
      style={{ background: "#25D366", color: "white" }}
    >
      <MessageCircle className="size-5" />
      <span className="hidden sm:inline">Chat on WhatsApp</span>
    </a>
  );
}