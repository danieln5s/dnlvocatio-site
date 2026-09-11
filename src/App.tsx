import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import About from "./pages/About";
import Journal from "./pages/Journal";
import Wedding from "./pages/Wedding";
import Resume from "./pages/Resume";
import Life from "./pages/Life";
import Cycling from "./pages/hobbies/Cycling";
import Travel from "./pages/hobbies/Travel";
import Running from "./pages/hobbies/Running";
import Fishing from "./pages/hobbies/Fishing";
import Reading from "./pages/hobbies/Reading";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Header from "./components/Header";
import ScrollToTop from "./components/ScrollToTop";
import PhotoAccessProvider from "./components/PhotoAccessProvider";
import AnalyticsConsent from "./components/AnalyticsConsent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PhotoAccessProvider>
        <ScrollToTop />
        <Header />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/about/resume" element={<Resume />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/journal/wedding" element={<Wedding />} />
          {/* Legacy /work URLs */}
          <Route path="/work" element={<Navigate to="/about" replace />} />
          <Route path="/work/resume" element={<Navigate to="/about/resume" replace />} />
          <Route path="/life" element={<Life />} />
          <Route path="/life/hobbies/cycling" element={<Cycling />} />
          <Route path="/life/hobbies/travel" element={<Travel />} />
          <Route path="/life/hobbies/running" element={<Running />} />
          <Route path="/life/hobbies/fishing" element={<Fishing />} />
          <Route path="/life/hobbies/reading" element={<Reading />} />
          <Route path="/contact" element={<Contact />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <AnalyticsConsent />
        </PhotoAccessProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
