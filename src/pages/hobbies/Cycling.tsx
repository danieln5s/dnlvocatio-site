import FadeInImage from "@/components/FadeInImage";
import PhotoAccessGate from "@/components/PhotoAccessGate";
import { Link } from "react-router-dom";

const Cycling = () => {
  return (
    <div className="min-h-screen bg-background pt-28">
      <main className="px-6 py-12">
        <Link to="/life" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <PhotoAccessGate subject="the cycling pictures" className="max-w-5xl mx-auto mt-6" />
        <div className="space-y-12 mt-6">
          <FadeInImage path="cycling/happy_selfie.jpg" alt="Cycling 1" caption="Happy selfie." fit="contain" preserve />
          <FadeInImage path="cycling/riding_fuel.jpg" alt="Cycling 2" caption="Riding fuel on a 70 km ride." fit="contain" preserve />
          <FadeInImage path="cycling/first_day_new_bike.jpg" alt="Cycling 3" caption="First day with new bike." fit="contain" preserve />
        </div>
      </main>
    </div>
  );
};

export default Cycling;
