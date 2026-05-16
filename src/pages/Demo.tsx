import { Link } from 'react-router-dom';
import { Flame, ArrowRight, PlayCircle, Clock, Zap, Download } from 'lucide-react';

// Replace this with your actual YouTube video ID (the part after ?v= in the URL)
const YOUTUBE_VIDEO_ID = 'YOUR_YOUTUBE_VIDEO_ID';

const highlights = [
  {
    icon: <Flame className="w-5 h-5 text-orange-500" />,
    title: 'Browse & Discover Drops',
    desc: 'Find the hottest upcoming drops from creators across every category.',
  },
  {
    icon: <Zap className="w-5 h-5 text-orange-500" />,
    title: 'Burn Credits to Accelerate',
    desc: 'Contribute credits to speed up the countdown timer and build momentum.',
  },
  {
    icon: <Clock className="w-5 h-5 text-orange-500" />,
    title: 'Watch the Clock Drop',
    desc: 'The more the community burns, the faster the countdown ticks toward release.',
  },
  {
    icon: <Download className="w-5 h-5 text-green-500" />,
    title: 'Download at a Discount',
    desc: 'Contributors unlock discounted download prices when the drop goes live.',
  },
];

export default function Demo() {
  return (
    <div className="min-h-screen bg-[#111827] text-[#e2e8f0]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#111827]/90 backdrop-blur border-b border-[#35354d]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-orange-500 font-bold text-xl">
            <Flame className="w-6 h-6" />
            Drauwper
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm text-[#94a3b8] hover:text-white transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition shadow-lg shadow-orange-500/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto text-center px-6 pt-16 pb-10 relative">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <PlayCircle className="w-4 h-4" />
            Platform Demo
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            See How Drauwper Works
          </h1>
          <p className="text-[#94a3b8] text-lg max-w-xl mx-auto">
            Watch the walkthrough below to learn how to discover drops, burn credits, and unlock exclusive content.
          </p>
        </div>
      </section>

      {/* Video Embed */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="relative w-full rounded-2xl overflow-hidden border border-[#35354d] shadow-2xl shadow-black/40 bg-[#1e1e2e]"
          style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?rel=0&modestbranding=1`}
            title="Drauwper Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      {/* Highlights */}
      <section className="bg-[#1e1e2e] border-y border-[#35354d] py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10">
            What You'll Learn
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {highlights.map((item, i) => (
              <div
                key={i}
                className="bg-[#2a2a3e] border border-[#35354d] rounded-xl p-5 hover:border-orange-500/50 transition"
              >
                <div className="mb-3">{item.icon}</div>
                <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                <p className="text-[#94a3b8] text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto text-center px-6 py-20">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to Jump In?</h2>
        <p className="text-[#94a3b8] mb-8 text-lg">
          Create a free account and start burning credits on the hottest drops today.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg px-8 py-4 rounded-xl transition shadow-xl shadow-orange-500/25"
          >
            Get Started <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/explore"
            className="flex items-center gap-2 border border-[#35354d] hover:border-orange-500/50 text-[#e2e8f0] font-semibold text-lg px-8 py-4 rounded-xl transition"
          >
            Browse Drops
          </Link>
        </div>
      </section>
    </div>
  );
}
