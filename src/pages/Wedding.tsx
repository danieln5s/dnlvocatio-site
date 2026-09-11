import { Link } from "react-router-dom";
import PhotoAccessGate from "@/components/PhotoAccessGate";
import ProtectedImage from "@/components/ProtectedImage";

// Order alternates landscape/portrait so the masonry columns stagger instead of clumping.
const photos = [
  { path: "wedding/primephoto-175.JPG", alt: "Walking hand in hand past applauding guests, Manhattan skyline behind" },
  { path: "wedding/primephoto-24.JPG", alt: "Buttoning the tuxedo jacket before the ceremony" },
  { path: "wedding/primephoto-185.JPG", alt: "Portrait by the Brooklyn Bridge" },
  { path: "wedding/primephoto-28.JPG", alt: "Close-up of the wedding band going on" },
  { path: "wedding/primephoto-212.JPG", alt: "Walking with the Manhattan skyline behind us" },
  { path: "wedding/primephoto-189.JPG", alt: "A kiss on the forehead with the skyline behind" },
  { path: "wedding/primephoto-215.JPG", alt: "Standing back to back on a garden path, her hand resting on his shoulder" },
  { path: "wedding/primephoto-259.JPG", alt: "Side by side at the altar during the ceremony" },
  { path: "wedding/primephoto-236.JPG", alt: "She holds his face in her hand as they laugh together in the garden" },
  { path: "wedding/primephoto-469.JPG", alt: "Seated in traditional embroidered dress at the reception" },
  { path: "wedding/primephoto-287.JPG", alt: "Walking arm in arm back down the aisle as guests applaud" },
  { path: "wedding/primephoto-502.JPG", alt: "Wedding photo" },
  { path: "wedding/primephoto-364.JPG", alt: "In the ballroom before the reception" },
  { path: "wedding/primephoto-539.JPG", alt: "First dance in traditional dress" },
];

const Wedding = () => {
  return (
    <div className="min-h-screen bg-background pt-28">
      <main className="px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <Link to="/journal" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
          <h1 className="text-4xl md:text-5xl font-bold mt-6 mb-2 text-foreground">The Wedding</h1>
          <p className="text-lg text-muted-foreground">New York, June 2026.</p>

          <PhotoAccessGate subject="the wedding photographs" className="mt-8" />
        </div>

        <div className="max-w-5xl mx-auto columns-1 sm:columns-2 lg:columns-3 gap-4 mt-12">
          {photos.map((photo) => (
            <ProtectedImage
              key={photo.path}
              path={photo.path}
              alt={photo.alt}
              className="w-full mb-4 rounded-md bg-muted break-inside-avoid"
              // Fixed height rather than an aspect ratio: inside a CSS column
              // layout, aspect-ratio boxes and column balancing feed back into
              // each other and the page never settles.
              placeholderClassName="w-full h-80 mb-4 break-inside-avoid"
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Wedding;
