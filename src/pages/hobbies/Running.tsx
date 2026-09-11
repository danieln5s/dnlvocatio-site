import FadeInImage from "@/components/FadeInImage";
import PhotoAccessGate from "@/components/PhotoAccessGate";
import { Link } from "react-router-dom";

const Running = () => {
  return (
    <div className="min-h-screen bg-background pt-28">
      <main className="px-6 py-12">
        <Link to="/life" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        <PhotoAccessGate subject="the running pictures" className="max-w-5xl mx-auto mt-6" />
        <div className="space-y-12 mt-6">
          <FadeInImage path="running/running_with_jona.jpg" alt="Running 1" caption="25 km run with the homie." fit="contain" preserve />
          <FadeInImage path="running/half_marathon.jpg" alt="Running 2" caption="Oslo Half Marathon 2024. Time: 2:04." fit="contain" preserve />
          <FadeInImage path="running/pre_half_marathon.jpg" alt="Running 3" caption="In line to start." fit="contain" preserve />
          <FadeInImage path="running/run_in_aarhus.jpg" alt="Running 4" caption="On work trip to Aarhus in Denmark, had to go for a run." fit="contain" preserve />
        </div>
      </main>
    </div>
  );
};

export default Running;
