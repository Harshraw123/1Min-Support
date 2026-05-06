import { BookOpen, Bot, Layers, LayoutDashboard, MessageCircle, Settings } from "lucide-react";


export const mainItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  
    // Knowledge → something related to learning/docs
    { title: "Knowledge", url: "/dashboard/knowledge", icon: BookOpen },
  
    // Sections → structure/grouping
    { title: "Sections", url: "/dashboard/sections", icon: Layers },
  
    // Chatbot → bot is fine here
    { title: "Chatbot", url: "/dashboard/chatbot", icon: Bot },
  
    // Conversations → chat/message icon
    { title: "Conversations", url: "/dashboard/conversations", icon: MessageCircle },
  
    // Settings → standard gear icon
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
  ];