import FadeInImage from "@/components/FadeInImage";
import PhotoAccessGate from "@/components/PhotoAccessGate";
import { Link } from "react-router-dom";

const Travel = () => {
  return (
    <div className="min-h-screen bg-background pt-28">
      <main className="px-6 py-12">
        <Link to="/life" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <PhotoAccessGate subject="the travel pictures" className="max-w-5xl mx-auto mt-6" />
        <div className="space-y-12 mt-6">
          <FadeInImage path="travel/rolls_royce_cullinan.jpg" alt="Photography 1" caption="Absolutely beautiful Rolls Royce Cullinan." fit="contain" preserve />
          <FadeInImage path="travel/candid_nyc.jpg" alt="Photography 2" caption="Candid with NYC in the background." fit="contain" preserve />
          <FadeInImage path="travel/flex.jpg" alt="Photography 3" caption="Have to flex a little." fit="contain" preserve />
          <FadeInImage path="travel/black_g_wagon.jpg" alt="Photography 4" caption="Cousin looking sharp with the black G-Wagon." fit="contain" preserve />
        </div>
      </main>
    </div>
  );
};

export default Travel;
