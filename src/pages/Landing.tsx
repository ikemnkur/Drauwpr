import { Link } from 'react-router-dom';
import { Flame, Clock, Download, Users, ArrowRight, Zap, Shield, TrendingUp } from 'lucide-react';

const steps = [
  {
    icon: <Flame className="w-8 h-8 text-orange-500" />,
    title: 'Creator Drops a File',
    desc: 'Games, music, apps, documents — upload anything and set a scheduled release window.',
  },
  {
    icon: <Clock className="w-8 h-8 text-orange-500" />,
    title: 'Community Burns Credits',
    desc: 'Fans contribute credits to accelerate the countdown timer. More burns = faster release.',
  },
  {
    icon: <TrendingUp className="w-8 h-8 text-orange-500" />,
    title: 'Momentum Builds',
    desc: 'Burn rate multiplies as contributors pile in. The clock ticks faster and faster.',
  },
  {
    icon: <Download className="w-8 h-8 text-green-500" />,
    title: 'Drop Goes Live',
    desc: 'When the countdown hits zero, the file drops. Contributors get discounted download prices.',
  },
];

const features = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Dynamic Burn Rate',
    desc: 'Real-time momentum engine with exponential decay. Every credit counts.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Contributor Rewards',
    desc: 'Top burners earn discounts, badges, fast downloads, and revenue share.',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Safe & Fair',
    desc: "Goal not met? Credits are fully refunded. No risk, just hype.",
  },
];

const stats = [
  { value: '1,000+', label: 'Active Drops' },
  { value: '50K+', label: 'Credits Burned Daily' },
  { value: '10K+', label: 'Community Members' },
  { value: '99.9%', label: 'Uptime' },
];

export default function Landing() {
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
        <div className="max-w-4xl mx-auto text-center px-6 pt-24 pb-20 relative">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
            <Flame className="w-4 h-4" />
            Drop It When It's Hot
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6">
            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Burn the Clock.
            </span>
            <br />
            <span className="text-white">Unlock the Drop.</span>
          </h1>
          <p className="text-lg md:text-xl text-[#94a3b8] max-w-2xl mx-auto mb-10 leading-relaxed">
            A social file-drop platform where fans spend credits to accelerate
            countdowns. The more the community burns, the faster the release.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg px-8 py-4 rounded-xl transition shadow-xl shadow-orange-500/25"
            >
              Start Burning <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 border border-[#35354d] hover:border-orange-500/50 text-[#e2e8f0] font-semibold text-lg px-8 py-4 rounded-xl transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[#1e1e2e] border-y border-[#35354d] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
            How It Works
          </h2>
          <p className="text-[#94a3b8] text-center max-w-xl mx-auto mb-14">
            Four simple steps from upload to download.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div
                key={i}
                className="relative bg-[#2a2a3e] border border-[#35354d] rounded-xl p-6 hover:border-orange-500/50 transition group"
              >
                <div className="absolute -top-3 -left-3 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {i + 1}
                </div>
                <div className="mb-4">{s.icon}</div>
                <h3 className="text-white font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-[#94a3b8] text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Burn Mechanic Visual */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-gradient-to-r from-[#1e1e2e] to-[#2a2a3e] border border-[#35354d] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-4">
                The Burn Rate Engine
              </h2>
              <p className="text-[#94a3b8] mb-6 leading-relaxed">
                Our momentum-based formula creates urgency and FOMO. As credits flow in,
                the burn rate accelerates — but it decays over time, so the community needs
                to keep the fire going.
              </p>
              <div className="bg-[#111827] border border-[#35354d] rounded-lg p-4 font-mono text-sm text-orange-400">
                <p className="text-[#64748b] text-xs mb-1">// Burn rate formula</p>
                <p>v = 1 + M</p>
                <p className="text-[#64748b] text-xs mt-2 mb-1">// Momentum with decay</p>
                <p>M = M₀ · e<sup>-kt</sup> + C / (G · S)</p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="w-48 h-48 rounded-full border-4 border-orange-500 flex items-center justify-center bg-orange-500/10 relative">
                <div className="text-center">
                  <Flame className="w-12 h-12 text-orange-500 mx-auto mb-1 animate-pulse" />
                  <span className="text-3xl font-bold text-orange-500">4.2x</span>
                  <p className="text-xs text-[#94a3b8]">Burn Rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#1e1e2e] border-y border-[#35354d] py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Why Drauwper?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-500/10 text-orange-500 rounded-xl mb-4">
                  {f.icon}
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-[#94a3b8] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div
                key={i}
                className="bg-[#2a2a3e] border border-[#35354d] rounded-xl p-6 text-center"
              >
                <p className="text-2xl md:text-3xl font-bold text-orange-500">{s.value}</p>
                <p className="text-[#94a3b8] text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Flame className="w-12 h-12 text-orange-500 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Drop?
          </h2>
          <p className="text-[#94a3b8] text-lg mb-8 max-w-xl mx-auto">
            Create an account, grab some credits, and start burning
            countdowns with the community.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg px-10 py-4 rounded-xl transition shadow-xl shadow-orange-500/25"
          >
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#35354d] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#94a3b8] text-sm">
            <Flame className="w-4 h-4 text-orange-500" />
            © {new Date().getFullYear()} Drauwper. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-[#64748b]">
            <Link to="/help" className="hover:text-white transition">Help</Link>
            <a href="mailto:support@Drauwper.com" className="hover:text-white transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
