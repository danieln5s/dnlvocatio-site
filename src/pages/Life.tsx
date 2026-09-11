import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import PhotoAccessGate from "@/components/PhotoAccessGate";
import ProtectedImage from "@/components/ProtectedImage";

const thumbnailClasses = "w-full h-full object-cover";
const thumbnailPlaceholderClasses = "w-full h-full rounded-none border-0";

const Life = () => {
  return (
    <div className="min-h-screen bg-background pt-28">
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-10 text-foreground">Life</h1>

        <section className="rounded-xl border border-border bg-muted p-6 md:p-8">
          <h2 className="text-3xl font-semibold text-foreground mb-2">Hobbies</h2>
          <p className="text-muted-foreground mb-8">The things I keep coming back to.</p>

          <PhotoAccessGate subject="the hobby pictures" className="mb-8" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link to="/life/hobbies/cycling" className="block">
            <div className="w-full h-56 bg-background rounded-md overflow-hidden mb-3 flex items-center justify-center">
              <ProtectedImage
                path="cycling/happy_selfie.jpg"
                alt="Cycling"
                interactive={false}
                className={thumbnailClasses}
                placeholderClassName={thumbnailPlaceholderClasses}
              />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Cycling</h3>
            <p className="text-muted-foreground text-sm">because I like speed.</p>
          </Link>

          <Link to="/life/hobbies/travel" className="block">
            <div className="w-full h-56 bg-background rounded-md overflow-hidden mb-3 flex items-center justify-center">
              <ProtectedImage
                path="travel/rolls_royce_cullinan.jpg"
                alt="Travel"
                interactive={false}
                className={thumbnailClasses}
                placeholderClassName={thumbnailPlaceholderClasses}
              />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Travel</h3>
            <p className="text-muted-foreground text-sm">because I like exploring.</p>
          </Link>

          <Link to="/life/hobbies/running" className="block">
            <div className="w-full h-56 bg-background rounded-md overflow-hidden mb-3 flex items-center justify-center">
              <ProtectedImage
                path="running/half_marathon.jpg"
                alt="Running"
                interactive={false}
                className={`${thumbnailClasses} object-[center_5%]`}
                placeholderClassName={thumbnailPlaceholderClasses}
              />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Running</h3>
            <p className="text-muted-foreground text-sm">because I like challenges.</p>
          </Link>

          <Link to="/life/hobbies/fishing" className="block">
            <div className="w-full h-56 bg-background rounded-md overflow-hidden mb-3 flex items-center justify-center">
              <ProtectedImage
                path="fishing/boating_life.jpg"
                alt="Fishing"
                interactive={false}
                className={`${thumbnailClasses} object-[center_60%]`}
                placeholderClassName={thumbnailPlaceholderClasses}
              />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Fishing</h3>
            <p className="text-muted-foreground text-sm">because I like peace.</p>
          </Link>

          <Link to="/life/hobbies/reading" className="block">
            <div className="w-full h-56 bg-background rounded-md overflow-hidden mb-3 flex items-center justify-center">
              <ProtectedImage
                path="reading/reading_book.jpg"
                alt="Reading"
                interactive={false}
                className={`${thumbnailClasses} object-[center_40%]`}
                placeholderClassName={thumbnailPlaceholderClasses}
              />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Reading</h3>
            <p className="text-muted-foreground text-sm">because I like inspiration.</p>
          </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Life;
