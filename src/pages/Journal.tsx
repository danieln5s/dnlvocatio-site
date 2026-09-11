import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import PhotoAccessGate from "@/components/PhotoAccessGate";
import ProtectedImage from "@/components/ProtectedImage";

// Newest entry first.
const entries = [
  {
    period: "June 2026",
    body: (
      <>
        We got married in New York. An unforgettable day surrounded by friends and family.{" "}
        <Link
          to="/journal/wedding"
          className="text-accent underline underline-offset-4 hover:no-underline"
        >
          See the rest of the photos
        </Link>
        .
      </>
    ),
    images: [
      { path: "wedding/primephoto-185.JPG", alt: "Portrait by the Brooklyn Bridge" },
      { path: "wedding/primephoto-212.JPG", alt: "Walking with the Manhattan skyline behind us" },
      { path: "wedding/primephoto-364.JPG", alt: "In the ballroom before the reception" },
      { path: "wedding/primephoto-539.JPG", alt: "First dance in traditional dress" },
    ],
  },
];

const Journal = () => {
  return (
    <div className="min-h-screen bg-background pt-28">
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">Journal</h1>
        <p className="text-lg text-muted-foreground mb-10">
          Where I am and what I'm up to, one entry at a time.
        </p>

        <PhotoAccessGate subject="the pictures in these entries" className="mb-10" />

        <div className="space-y-10">
          {entries.map((entry) => (
            <article
              key={entry.period}
              className="rounded-xl border border-border bg-muted p-6 md:p-8"
            >
              <h2 className="text-2xl font-semibold text-foreground mb-3">{entry.period}</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">{entry.body}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {entry.images.map((image) => (
                  <ProtectedImage
                    key={image.path}
                    path={image.path}
                    alt={image.alt}
                    className="w-full h-64 object-cover rounded-md bg-background"
                    placeholderClassName="w-full h-64 rounded-md"
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Journal;
