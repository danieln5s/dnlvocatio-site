import FadeInQuote from "@/components/FadeInQuote";
import PhotoAccessGate from "@/components/PhotoAccessGate";
import { Link } from "react-router-dom";

const Reading = () => {
  const quotes = [
    {
      quote: "I offer the following description: Christian contentment is that sweet, inward, quiet, gracious frame of spirit, which freely submits to and delights in God's wise and fatherly disposal in every condition. [...] Not only must the tongue hold its peace; the soul must be silent. Many may sit silently, refraining from discontented expressions, yet inwardly they are bursting with discontented expressions, yet inwardly they are bursting with discontent.",
      author: "Jeremiah Burroughs, The Rare Jewel of Christian Contentment",
      authorImagePath: "reading/jeremiah_burroughs.jpg",
      fontFamily: "'EB Garamond', Georgia, 'Times New Roman', serif",
    },
    {
      quote: "The human heart is a perpetual idol factory.",
      author: "John Calvin, The Institutes of the Christian Religion 1.11.8",
      authorImagePath: "reading/john_calvin.jpg",
      fontFamily: "'EB Garamond', Georgia, 'Times New Roman', serif",
    },
    {
      quote: "Sacerdotis Christi os, mens, manusque concordent; a minister of Christ should have his tongue, and his heart, and his hand agree.",
      author: "Charles Spurgeon, Lectures to My Students",
      authorImagePath: "reading/charles_spurgeon.jpg",
      fontFamily: "'EB Garamond', Georgia, 'Times New Roman', serif",
    },
    {
      quote: "We all carry in our pockets His very nails.",
      author: "Martin Luther, Commentary on Galatians",
      authorImagePath: "reading/martin_luther.jpg",
      fontFamily: "'Playfair Display', serif",
    },
    {
      quote: "God has given to mankind affections, for the same purpose which he has given all the faculties and principles of the human soul for, viz., that they might be subservient to man's chief end, and the great business for which God has created him, that is, the business of religion.",
      author: "Jonathan Edwards, The Religious Affections",
      authorImagePath: "reading/jonathan_edwards.jpg",
      fontFamily: "'EB Garamond', Georgia, 'Times New Roman', serif",
    },
    {
      quote: "Our heart is restless, until it rests in thee.",
      author: "Augustine of Hippo, Confessions",
      authorImagePath: "reading/augustine_of_hippo.jpg",
      fontFamily: "'EB Garamond', Georgia, 'Times New Roman', serif",
    },
    {
      quote: "Often, you, as a sinner, will be the main cross your spouse is called to bear. In this fallen world, there are no promises that marriage, for all its capacity to be beautiful and enriching, will be a lifelong series of ever increasing physical delights. In reality, a healthy marriage will probably lean more on the Sermon on the Mount than on the Song of Solomon.",
      author: "Herman Bavinck, The Christian Family",
      authorImagePath: "reading/herman_bavinck.jpg",
      fontFamily: "'EB Garamond', Georgia, 'Times New Roman', serif",
    },
    {
      quote: "There is an awful passage in John Bunyan's treatise, entitled 'Sighs from Hell', which full often rings in my ears:–'How many souls have blind priests been the means of destroying by their ignorance? Preaching that was no better for their souls than rats-bane to the body.'",
      author: "Charles Spurgeon, Lectures to My Students",
      authorImagePath: "reading/charles_spurgeon.jpg",
      fontFamily: "'EB Garamond', Georgia, 'Times New Roman', serif",
    },
    {
      quote: "It is remarkable that the only church history we have is, \"The Acts of the apostles.\" The Holy Spirit has not preserved their sermons. They were very good ones, better than we shall ever preach, but still the Holy Spirit has only taken care of their 'acts.'",
      author: "Charles Spurgeon, Lectures to My Students",
      authorImagePath: "reading/charles_spurgeon.jpg",
      fontFamily: "'EB Garamond', Georgia, 'Times New Roman', serif",
    },
    {
      quote: "One brother I have encountered–one did I say? I have met ten, twenty, a hundred brethren, who have pleaded that they were sure, quite sure that they were called to the ministry–they were quite certain of it, because they had failed in everything else. [...] My answer generally is, \"Yes, I see; you have failed, in everything else, and therefore you think the Lord has especially endowed you for his service; but I fear you have forgotten that the ministry needs the very best of men, and not those who cannot do anything else. [...] There is scarcely anything impossible to a man who can keep a congregation together for years, and be the means of edifying them for hundreds of consecutive Sabbaths; he must be possessed of some abilities, and be by no means a fool or ne'er-do-well. Jesus Christ deserves the best men to preach his cross, and not the empty-headed and the shiftless.",
      author: "Charles Spurgeon, Lectures to My Students",
      authorImagePath: "reading/charles_spurgeon.jpg",
      fontFamily: "'EB Garamond', Georgia, 'Times New Roman', serif",
    },
    {
      quote: "The authority of the father, the love of the mother, and the obedience of the child form in their unity the threefold cord that binds together and sustains all relationships within human society. Within the psychological life of every integrated personality this triple cord forms the motif and melody. No man is complete without some feminine qualities, no woman is complete without some masculine qualities, and to both man and woman, the child is held up as an example (Matt. 18:3). These three characteristics and gifts are always needed in every society and in every civilization, in the church and in the state. Authority, love, and obedience are the pillars of all human society.",
      author: "Herman Bavinck, The Christian Family",
      authorImagePath: "reading/herman_bavinck.jpg",
      fontFamily: "'EB Garamond', Georgia, 'Times New Roman', serif",
    },
    {
      quote: "The man is susceptible to the danger of doubt and unbelief, rationalism and dead orthodoxy, while the woman risks no less a danger of superficial piety and superstition, mysticism and fanaticism. [...] The man finds in the woman his complement and his corrective, and conversely, the woman finds in the man the very same things. [...] Without the woman, the man easily becomes insensitive, dissolute, egocentric, and without the man the gentleness of the woman degenerates very easily into weakness, her love into sentimentality.",
      author: "Herman Bavinck, The Christian Family",
      authorImagePath: "reading/herman_bavinck.jpg",
      fontFamily: "'EB Garamond', Georgia, 'Times New Roman', serif",
    },
  ];

  return (
    <div className="min-h-screen bg-background pt-28">
      <main className="px-6 py-12">
        <Link to="/life" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>

        <PhotoAccessGate subject="the author portraits" className="max-w-4xl mx-auto mt-6" />

        <div className="space-y-12 mt-6">
          {quotes.map((q, idx) => (
            <FadeInQuote
              key={idx}
              quote={q.quote}
              author={q.author}
              authorImagePath={q.authorImagePath}
              fontFamily={q.fontFamily}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Reading;
