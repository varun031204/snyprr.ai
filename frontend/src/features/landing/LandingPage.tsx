import { Link, useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect, useCallback } from 'react';
import { TrendingUp, ArrowRight, BarChart2, ShieldCheck, Quote, ChevronLeft, ChevronRight, Menu, X, Check, Sparkles, Gift, Target, Clock, Star } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { useSubscriptionPlans } from '../../hooks/useSubscriptionsQuery';

import { LandingChatbot } from '../../components/chatbot/LandingChatbot';
import heroVideo from '../../assets/hero.mp4';
import { useAuthStore } from '../../state/useAuthStore';
import { useUIStore } from '../../state/useUIStore';
import { Logo } from '../../components/ui/Logo';

const stats = [
  { label: 'Desk Win Rate*', value: '76.4%', icon: <BarChart2 className="w-5 h-5" /> },
  { label: 'Avg Desk R/R*', value: '1 : 2.8', icon: <Target className="w-5 h-5" /> },
  { label: 'Always Available', value: '24/7', icon: <Clock className="w-5 h-5" /> },
  { label: 'Published Setups', value: '1,200+', icon: <TrendingUp className="w-5 h-5" /> },
];

const TESTIMONIALS = [
  { name: 'Arjun Mehta', role: 'Retail Trader', initials: 'AM', color: 'from-violet-500 to-purple-600', rating: 5, text: 'Snyprr.ai changed how I study the markets. The analyst desk setups save me hours of research every day — everything is laid out clearly.' },
  { name: 'Priya Sharma', role: 'Crypto Enthusiast', initials: 'PS', color: 'from-emerald-500 to-teal-500', rating: 5, text: 'I love how transparent everything is — defined zones, track records, historical outcomes. No fluff, just structured analysis.' },
  { name: 'Rohan Kapoor', role: 'Forex Trader', initials: 'RK', color: 'from-blue-500 to-cyan-500', rating: 5, text: 'The TradingView charts integrated directly in the dashboard are a game changer. Everything I need for analysis is in one place.' },
  { name: 'Sneha Patel', role: 'Market Analyst', initials: 'SP', color: 'from-rose-500 to-pink-500', rating: 4, text: "Best platform for structured market analysis without the noise. The clearly published zones and historical outcomes help me learn more systematically." },
  { name: 'Karan Singh', role: 'Day Trader', initials: 'KS', color: 'from-orange-500 to-amber-500', rating: 5, text: 'The clean UI and well-structured setups make Snyprr.ai stand out. Great platform for anyone who wants to study market setups seriously.' },
  { name: 'Ananya Verma', role: 'Market Enthusiast', initials: 'AV', color: 'from-indigo-500 to-blue-500', rating: 5, text: 'Finally a platform with a real published track record. The data quality and transparency of the analyst desk process is top-notch.' },
];

function TestimonialsCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [animKey, setAnimKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = TESTIMONIALS.length;

  const goTo = useCallback((idx: number, dir: 'left' | 'right' = 'right') => {
    setDirection(dir);
    setAnimKey(k => k + 1);
    setCurrent((idx + total) % total);
  }, [total]);

  const prev = () => goTo(current - 1, 'left');
  const next = useCallback(() => goTo(current + 1, 'right'), [current, goTo]);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(next, 5000); // Increased from 4s to 5s for better readability
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, next]);

  const visibleIdx = [-1, 0, 1].map(offset => (current + offset + total) % total);

  return (
    <section
      id="testimonials"
      className="px-6 md:px-10 py-16 max-w-6xl mx-auto"
      style={{ animation: 'testimonials-section-in 1s ease-out both' }}
    >
      <div
        className="text-center mb-12"
        style={{ animation: 'testimonials-header-in 0.8s ease-out 0.2s both' }}
      >
        <p className="text-xs font-medium text-[var(--brand-primary)] uppercase tracking-widest mb-2">What Our Users Say</p>
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">Trusted by Traders Worldwide</h2>
        <p className="text-[var(--text-muted)] mt-3 text-sm max-w-xl mx-auto">
          Thousands of users track smarter every day with Snyprr.ai. Here's what they have to say.
        </p>
      </div>

      <div
        className="relative px-6"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        style={{ animation: 'testimonials-carousel-in 0.8s ease-out 0.4s both' }}
      >
        {/* Previous Button */}
        <button
          id="testimonials-prev"
          onClick={prev}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full flex items-center justify-center bg-[var(--bg-card)] border-2 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] hover:scale-110 hover:shadow-lg hover:shadow-[var(--brand-glow)] transition-all duration-300 backdrop-blur-sm"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 grid-cols-1 gap-5 items-stretch">
          {visibleIdx.map((tIdx, position) => {
            const t = TESTIMONIALS[tIdx];
            const isCenter = position === 1;
            const animationName = isCenter
              ? `testimonial-enter-${direction}`
              : 'testimonial-fade-in';
            const animationDuration = isCenter ? '0.6s' : '0.5s';
            const animationDelay = isCenter ? '0ms' : '100ms';

            return (
              <div
                key={`${animKey}-${position}`}
                style={{
                  animation: `${animationName} ${animationDuration} cubic-bezier(0.34, 1.56, 0.64, 1) ${animationDelay} both`,
                }}
                className={`flex flex-col ${position !== 1 ? 'hidden md:flex' : ''}`}
              >
                <div className={`flex flex-col gap-4 relative overflow-hidden rounded-2xl p-6 h-full transition-all duration-500 ${isCenter
                    ? 'scale-105 border-2 border-[var(--brand-primary)] shadow-[0_8px_40px_-8px_var(--brand-primary)] bg-[var(--bg-card)]'
                    : 'scale-95 opacity-60 border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:opacity-80 hover:scale-100'
                  }`}>
                  {/* Gradient Overlay for center card */}
                  {isCenter && (
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)]/10 via-transparent to-[var(--brand-vivid)]/5 pointer-events-none rounded-2xl"
                      style={{ animation: 'gradient-pulse 3s ease-in-out infinite' }}
                    />
                  )}

                  {/* Quote Icon */}
                  <Quote className={`absolute top-4 right-5 w-12 h-12 pointer-events-none transition-all duration-500 ${isCenter
                      ? 'text-[var(--brand-primary)] opacity-20'
                      : 'text-[var(--text-muted)] opacity-10'
                    }`} />

                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5 relative z-10">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 transition-all duration-300 ${i < t.rating
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_2px_4px_rgba(251,191,36,0.3)]'
                            : 'text-[var(--border-subtle)]'
                          }`}
                      />
                    ))}
                  </div>

                  {/* Testimonial Text */}
                  <p className={`text-sm leading-relaxed flex-1 relative z-10 transition-all duration-500 ${isCenter
                      ? 'text-[var(--text-primary)] font-medium'
                      : 'text-[var(--text-muted)]'
                    }`}>
                    "{t.text}"
                  </p>

                  {/* User Info */}
                  <div className={`flex items-center gap-3 pt-3 border-t relative z-10 transition-all duration-500 ${isCenter
                      ? 'border-[var(--brand-primary)]/30'
                      : 'border-[var(--border-subtle)]'
                    }`}>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center flex-shrink-0 transition-all duration-500 ${isCenter
                        ? 'shadow-lg shadow-[var(--brand-primary)]/20'
                        : 'opacity-70'
                      }`}>
                      <span className="text-white text-sm font-extrabold">{t.initials}</span>
                    </div>
                    <div>
                      <p className={`text-xs font-bold transition-all duration-500 ${isCenter
                          ? 'text-[var(--text-primary)]'
                          : 'text-[var(--text-muted)]'
                        }`}>
                        {t.name}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">{t.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          id="testimonials-next"
          onClick={next}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full flex items-center justify-center bg-[var(--bg-card)] border-2 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] hover:scale-110 hover:shadow-lg hover:shadow-[var(--brand-glow)] transition-all duration-300 backdrop-blur-sm"
          aria-label="Next testimonial"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-2 mt-10">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > current ? 'right' : 'left')}
            aria-label={`Go to testimonial ${i + 1}`}
            className={`rounded-full transition-all duration-500 ${i === current
                ? 'w-8 h-2.5 bg-[var(--brand-primary)] shadow-[0_0_12px_var(--brand-primary)]'
                : 'w-2.5 h-2.5 bg-[var(--border-subtle)] hover:bg-[var(--text-muted)] hover:scale-125'
              }`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      {!paused && (
        <div className="mt-6 max-w-xs mx-auto h-1 bg-[var(--border-subtle)] rounded-full overflow-hidden">
          <div
            key={`pb-${current}`}
            className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-vivid)] rounded-full shadow-[0_0_8px_var(--brand-primary)]"
            style={{ animation: 'tb-progress 5s linear forwards' }}
          />
        </div>
      )}
    </section>
  );
}

function PricingSection() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Define pricing tiers with Indian Rupee prices
  const pricingTiers = [
    {
      id: 'standard',
      name: 'Standard',
      description: 'Perfect for individual traders learning market analysis',
      badge: null,
      isPopular: false,
      priceMonthly: 999,
      priceYearly: 10999,
      priceYearlyOriginal: 11999,
      features: [
        'Chart Analysis with Explanation',
        'Access to Copilot / AI Assistant',
        'Paper Trading Simulation',
        'Real-time Market Data',
        'Historical Setup Outcomes',
        'Community Access',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'Advanced features for serious traders',
      badge: 'Most Popular',
      isPopular: true,
      priceMonthly: 1499,
      priceYearly: 15999,
      priceYearlyOriginal: 17999,
      features: [
        'Everything in Standard',
        '1-on-1 Educational Slot Booking',
        'Master Trader Sessions',
        '24/7 Priority Support',
        'Advanced AI Analytics',
        'Custom Alerts & Notifications',
        'Export & Download Reports',
      ],
    },
  ];

  const discountPercent = 10; // 10% off for yearly

  return (
    <section id="pricing" className="px-6 md:px-10 py-16 max-w-6xl mx-auto">
      <div className="text-center mb-10" style={{ animation: 'pricing-fade-in 0.8s ease-out both' }}>
        <p className="text-xs font-medium text-[var(--brand-primary)] uppercase tracking-widest mb-2">Plans &amp; Pricing</p>
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">Simple, Transparent Pricing</h2>
        <p className="text-[var(--text-muted)] mt-3 text-sm max-w-xl mx-auto">
          Choose the plan that works for you. Start with a 7-day free trial, full access, no credit card required.
        </p>
      </div>

      {/* Trial Banner */}
      <div
        className="max-w-2xl mx-auto mb-8 p-4 rounded-2xl bg-gradient-to-r from-[var(--brand-glow)] via-[var(--bg-surface)] to-[var(--brand-glow)] border border-[var(--brand-primary)]/40 text-center flex items-center justify-center gap-3 shadow-lg"
        style={{ animation: 'pricing-fade-in 0.8s ease-out 0.2s both' }}
      >
        <Gift className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0 animate-bounce" />
        <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
          <span className="text-[var(--brand-primary)] font-bold">7-Day Free Trial</span> on all plans. Full access, zero risk, cancel anytime.
        </p>
      </div>

      {/* Billing Toggle */}
      <div
        className="flex justify-center mb-10"
        style={{ animation: 'pricing-fade-in 0.8s ease-out 0.3s both' }}
      >
        <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shadow-lg">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${billingCycle === 'monthly'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-md scale-105'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50'
              }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${billingCycle === 'yearly'
              ? 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white shadow-lg shadow-[var(--brand-glow)] scale-105'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50'
              }`}
          >
            Yearly
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${billingCycle === 'yearly' ? 'bg-white/20' : 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]'
              }`}>
              Save {discountPercent}%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {pricingTiers.map((plan, index) => {
          const price = billingCycle === 'monthly' ? plan.priceMonthly : Math.round(plan.priceYearly / 12);
          const yearlyTotal = plan.priceYearly;
          const yearlyOriginal = plan.priceYearlyOriginal;
          const showYearlyDiscount = billingCycle === 'yearly';

          return (
            <GlassCard
              key={plan.id}
              className={`relative flex flex-col justify-between p-8 rounded-3xl transition-all duration-500 ${plan.isPopular
                ? 'border-2 border-[var(--brand-primary)] shadow-2xl shadow-[var(--brand-glow)] scale-105'
                : 'border border-[var(--border-subtle)]'
                }`}
              style={{ animation: `pricing-card-in 0.6s ease-out ${0.4 + index * 0.1}s both` }}
            >
              {plan.badge && (
                <span className="absolute -top-3 right-6 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white shadow-lg animate-pulse">
                  {plan.badge}
                </span>
              )}

              <div className="space-y-6">
                {/* Header */}
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">{plan.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">{plan.description}</p>
                </div>

                {/* Price */}
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold font-mono-num text-[var(--text-primary)]">₹{price}</span>
                    <span className="text-sm text-[var(--text-muted)]">/ month</span>
                  </div>

                  {showYearlyDiscount && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-[var(--text-muted)]">
                        <span className="line-through">₹{yearlyOriginal}</span>
                        <span className="ml-2 font-bold text-[var(--color-success)]">₹{yearlyTotal}/year</span>
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30">
                        <Check className="w-3 h-3" /> {discountPercent}% OFF
                      </span>
                    </div>
                  )}

                  <p className="text-[11px] font-semibold text-[var(--color-success)] mt-3 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> 7-Day Free Trial (₹0 due today)
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">What's Included</p>
                  {plan.features.map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]"
                      style={{ animation: `feature-fade-in 0.4s ease-out ${0.6 + index * 0.1 + i * 0.05}s both` }}
                    >
                      <div className="w-4 h-4 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              <Button
                variant={plan.isPopular ? 'primary' : 'secondary'}
                size="lg"
                className="w-full mt-8"
                onClick={() => navigate(currentUser ? '/subscriptions' : '/signup')}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                {currentUser ? 'Manage Subscription' : `Start 7-Day Free Trial`}
              </Button>
            </GlassCard>
          );
        })}
      </div>

      {/* Additional Info */}
      <div
        className="mt-10 text-center max-w-2xl mx-auto"
        style={{ animation: 'pricing-fade-in 0.8s ease-out 0.8s both' }}
      >
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          All plans include full platform access during the trial period. Cancel anytime before trial ends — no charges.
          Prices shown in Indian Rupees (₹). For other currencies or enterprise plans, <Link to="/contact-us" className="text-[var(--brand-primary)] hover:underline font-medium">contact us</Link>.
        </p>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme } = useUIStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] overflow-x-clip">
      {/* Ambient glows */}
      <div className="fixed top-[-180px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[var(--brand-primary)]/10 blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-150px] right-[-100px] w-[500px] h-[500px] rounded-full bg-[var(--brand-vivid)]/8 blur-[120px] pointer-events-none" />

      {/* ── Hero — full background image, navbar floats on top ── */}
      <section id="top" className="relative overflow-hidden min-h-[92vh] flex flex-col">

        {/* ── Background image ── */}
        <div className="absolute inset-0 z-0" aria-hidden="true">
          <video
            src={heroVideo}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center select-none pointer-events-none"
            style={{
              opacity: theme === 'neo-light' ? 0.45 : 0.90,
              transition: 'opacity 0.4s ease',
            }}
          />
          {/* Overlay for readability */}
          <div
            className="absolute inset-0"
            style={{
              background: theme === 'neo-light'
                ? 'linear-gradient(105deg, rgba(247,246,250,0.82) 0%, rgba(247,246,250,0.65) 40%, rgba(247,246,250,0.30) 70%, rgba(247,246,250,0.05) 100%)'
                : 'linear-gradient(105deg, rgba(5,5,7,0.82) 0%, rgba(5,5,7,0.65) 40%, rgba(5,5,7,0.35) 70%, rgba(5,5,7,0.00) 100%)',
              transition: 'background 0.4s ease',
            }}
          />
          {theme !== 'neo-light' && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 60% 80% at 85% 50%, rgba(177,124,254,0.14) 0%, transparent 70%)',
                animation: 'heroPulse 4s ease-in-out infinite',
              }}
            />
          )}
        </div>

        {/* ── Navbar — floats over hero, fully transparent, no border ── */}
        <header className="relative z-50 w-full pt-5">
          <div className="flex items-center justify-between px-5 sm:px-8 md:px-12">

            {/* LEFT: Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <Logo className="h-9 object-contain" />
            </Link>

            {/* CENTER: Plain text nav links — no pill, no background */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { label: 'Home', href: '#top', isRoute: false },
                { label: 'About Us', href: '/about', isRoute: true },
                { label: 'Help', href: '#help', isRoute: false },
                { label: 'Pricing', href: '#pricing', isRoute: false },
              ].map((item) =>
                item.isRoute ? (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200 rounded-lg hover:bg-white/10"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200 rounded-lg hover:bg-white/10"
                  >
                    {item.label}
                  </a>
                )
              )}
            </nav>

            {/* RIGHT: ThemeToggle · Sign In · Sign Up */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <ThemeToggle />
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login">
                  <button className="px-4 py-2 rounded-full text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-all duration-200">
                    Sign In
                  </button>
                </Link>
                <Link to="/signup">
                  <button
                    className="px-4 py-2 rounded-full text-sm font-semibold text-white flex items-center gap-1.5 transition-all duration-200 hover:opacity-90"
                    style={{
                      background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-vivid) 100%)',
                      boxShadow: '0 4px 18px -4px var(--brand-primary)',
                    }}
                  >
                    Sign Up <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-all"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown */}
          {mobileMenuOpen && (
            <div
              className="md:hidden mx-4 mt-2 rounded-2xl overflow-hidden"
              style={{
                background: theme === 'neo-light' ? 'rgba(255,255,255,0.95)' : 'rgba(14,12,22,0.95)',
                backdropFilter: 'blur(24px)',
                border: '1.5px solid var(--border-glass)',
              }}
            >
              <div className="p-3 space-y-1">
                {[
                  { label: 'Home', href: '#top' },
                  { label: 'About Us', href: '/about' },
                  { label: 'Help', href: '#help' },
                  { label: 'Pricing', href: '#pricing' },
                ].map((item) => (
                  <a key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--brand-glow)] transition-colors">
                    {item.label}
                  </a>
                ))}
                <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-col gap-2">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-center">Sign In</Button>
                  </Link>
                  <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full justify-center">Sign Up</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* ── Hero text content ── */}
        <div className="relative z-10 flex-1 flex items-center w-full max-w-7xl mx-auto px-5 sm:px-8 md:px-12 py-16 md:py-20">
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.1] text-[var(--text-primary)] mb-6">
              Study verified
              <span className="block neo-glow-text mt-1">market analysis setups.</span>
            </h1>

            <p className="text-base md:text-lg text-[var(--text-muted)] leading-relaxed mb-8">
              Snyprr.ai publishes analyst desk setups with defined entry zones, exit zones, and rationale.
              Track historical outcomes transparently — no execution, no financial advice.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />} onClick={() => navigate('/signup')}>
                Start Tracking Free
              </Button>
              <a href="#pricing">
                <Button variant="secondary" size="lg">View Plans &amp; Pricing</Button>
              </a>
            </div>

            {/* Stats — 2×2 compact grid */}
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {stats.map((s) => (
                <GlassCard key={s.label} className="flex items-center gap-3 py-3 px-4" hoverEffect={false}>
                  <div className="w-8 h-8 rounded-lg bg-[var(--brand-glow)] text-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-base font-extrabold font-mono-num text-[var(--text-primary)] leading-none">{s.value}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">{s.label}</p>
                  </div>
                </GlassCard>
              ))}
            </div>
            <p className="text-[9px] text-[var(--text-muted)] mt-1 max-w-sm leading-relaxed">
              *Historical figures based on published desk setups. Past performance is not indicative of future results.
            </p>
          </div>
        </div>
      </section>

      {/* ── About Us / Mission ── */}
      <section id="about" className="px-6 md:px-10 py-16 max-w-6xl mx-auto scroll-mt-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Mission Statement */}
          <div className="space-y-6" style={{ animation: 'mission-fade-in 0.8s ease-out both' }}>
            <span className="inline-flex items-center text-xs font-semibold px-3.5 py-1 rounded-full bg-[var(--brand-glow)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/30 uppercase tracking-wider">
              Our Mission
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] leading-tight">
              Empowering traders with
              <span className="block neo-glow-text mt-1">transparent analysis.</span>
            </h2>
            <p className="text-base text-[var(--text-muted)] leading-relaxed">
              At Snyprr.ai, we believe market education should be transparent, structured, and accessible to everyone.
              We publish analyst desk setups with defined entry and exit zones, track historical outcomes openly,
              and provide the tools you need to study markets without execution pressure.
            </p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              No hidden agendas. No execution services. Just pure market analysis for educational purposes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link to="/about">
                <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Learn More About Us
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="secondary" size="md">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Value Props Cards */}
          <div className="grid grid-cols-1 gap-4">
            {[
              {
                icon: <ShieldCheck className="w-6 h-6" />,
                title: 'Transparent Publishing',
                desc: 'Every setup published with full zones, rationale, and historical outcome tracking.',
                delay: '0.2s'
              },
              {
                icon: <TrendingUp className="w-6 h-6" />,
                title: 'Historical Track Record',
                desc: 'Public win rates and R:R ratios based on published desk setups — nothing hidden.',
                delay: '0.3s'
              },
              {
                icon: <Target className="w-6 h-6" />,
                title: 'Education Focused',
                desc: 'No trade execution, no fund management — purely structured market analysis.',
                delay: '0.4s'
              },
            ].map((item, i) => (
              <GlassCard
                key={i}
                className="p-5 flex items-start gap-4"
                hoverEffect
                style={{ animation: `mission-card-in 0.6s ease-out both ${item.delay}` }}
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--brand-glow)] text-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{item.title}</h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.desc}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Help / FAQ ── */}
      <section id="help" className="px-6 md:px-10 py-16 max-w-5xl mx-auto scroll-mt-24">
        <div className="text-center mb-12">
          <p className="text-xs font-medium text-[var(--brand-primary)] uppercase tracking-widest mb-2">Support</p>
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">Frequently Asked Questions</h2>
          <p className="text-[var(--text-muted)] mt-3 text-sm max-w-xl mx-auto">Everything you need to know about Snyprr.ai before getting started.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {[
            { q: 'What is Snyprr.ai?', a: 'Snyprr.ai is a market analysis and chart education platform. Our in-house analyst desk publishes setups — including defined entry zones, exit zones, and rationale — which you can study and track for educational purposes. Nothing on Snyprr.ai constitutes financial advice.' },
            { q: 'Does Snyprr.ai execute trades?', a: 'No. Snyprr.ai does not execute trades, manage funds, or provide brokerage services. All execution decisions remain entirely yours. The platform is for study and educational tracking only.' },
            { q: 'How is a setup\'s history tracked?', a: 'Every setup is published with defined zones at the time of publication. Outcome declarations are made by our analyst desk and compared against market data. Historical track records reflect published setups only and do not guarantee future accuracy.' },
            { q: 'What markets are covered?', a: 'Currently Crypto (BTC, ETH, SOL, XRP) and Commodities (Gold, Silver). More instruments may be added as the platform grows.' },
            { q: 'Is there a free trial?', a: 'Yes — all plans include a free trial period. Full access during the trial, cancel anytime before it ends. See the Subscriptions page for current trial length.' },
            { q: 'Is the platform live?', a: 'Yes, the platform is live. We continue to expand features and instruments. Nothing published on Snyprr.ai should be treated as financial advice.' },
          ].map((faq) => (
            <GlassCard key={faq.q} hoverEffect={false} className="p-5 space-y-2">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{faq.q}</p>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{faq.a}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <TestimonialsCarousel />
      {/* View all testimonials link */}
      <div className="text-center -mt-8 pb-4">
        <Link to="/testimonials">
          <Button variant="outline" size="sm">View All Testimonials →</Button>
        </Link>
      </div>

      {/* ── Pricing ── */}
      <PricingSection />

      {/* ── CTA ── */}
      <section className="px-6 py-20 text-center">
        <GlassCard className="max-w-2xl mx-auto py-12 px-8">
          <h2 className="text-3xl font-extrabold mb-3">Ready to study smarter?</h2>
          <p className="text-[var(--text-muted)] mb-8">Join members who study structured analyst setups and track historical outcomes transparently. For educational purposes only.</p>
          <div className="flex justify-center">
            <Button variant="primary" size="lg" onClick={() => navigate('/signup')} rightIcon={<ArrowRight className="w-5 h-5" />}>
              Create Free Account
            </Button>
          </div>
        </GlassCard>
      </section>

      {/* ── Community & Socials ── */}
      <section id="community" className="px-6 py-16 max-w-6xl mx-auto scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto mb-12 flex flex-col items-center gap-4">
          <span className="inline-flex items-center text-xs font-semibold px-3.5 py-1 rounded-full bg-[var(--brand-glow)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/30 uppercase tracking-wider">
            COMMUNITY & SOCIALS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">Follow Us Across Platforms</h2>
          <p className="text-sm text-[var(--text-muted)] max-w-xl">Connect with our official channels for market updates, daily chart breakdowns, educational content, and community discussions.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { href: 'https://twitter.com', hover: 'hover:border-sky-500/50 hover:bg-sky-500/5', color: 'text-sky-400', name: 'Twitter / X', desc: 'Market updates, chart breakdowns, and educational content on crypto and commodities.', handle: 'Follow @TradeBeast', iconCls: 'bg-sky-500/10 text-sky-400 border-sky-500/20', svg: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> },
            { href: 'https://instagram.com', hover: 'hover:border-pink-500/50 hover:bg-pink-500/5', color: 'text-pink-400', name: 'Instagram', desc: 'Visual chart breakdowns, educational trading carousels, and platform updates.', handle: 'Follow @tradebeast', iconCls: 'bg-gradient-to-tr from-amber-500/20 via-pink-500/20 to-purple-500/20 text-pink-400 border-pink-500/20', svg: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg> },
            { href: 'https://facebook.com', hover: 'hover:border-blue-500/50 hover:bg-blue-500/5', color: 'text-blue-400', name: 'Facebook', desc: 'Official community group, educational discussions, and platform news.', handle: 'Join Community', iconCls: 'bg-blue-600/10 text-blue-400 border-blue-600/20', svg: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg> },
            { href: 'https://discord.gg/snyprr', hover: 'hover:border-indigo-500/50 hover:bg-indigo-500/5', color: 'text-indigo-400', name: 'Discord Community', desc: 'Community discussions, educational sessions, and platform announcements.', handle: 'Join Server', iconCls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', svg: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg> },
          ].map((s) => (
            <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" className="group block">
              <GlassCard className={`h-full p-6 rounded-2xl flex flex-col justify-between border border-[var(--border-subtle)] ${s.hover} transition-all duration-300 transform group-hover:-translate-y-1`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl ${s.iconCls} border flex items-center justify-center group-hover:scale-110 transition-transform`}>{s.svg}</div>
                  </div>
                  <div>
                    <h3 className={`text-base font-bold text-[var(--text-primary)] group-hover:${s.color} transition-colors`}>{s.name}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
                <div className={`mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold ${s.color}`}>
                  <span>{s.handle}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </GlassCard>
            </a>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border-subtle)] px-8 py-10 text-center text-xs text-[var(--text-muted)] space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto pb-6 border-b border-[var(--border-subtle)]/60">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--text-primary)] tracking-wide">Snyprr.ai</span>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">Official</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[var(--text-secondary)] mr-1">Follow Us:</span>
            {[
              { href: 'https://twitter.com', label: 'Twitter', cls: 'hover:border-sky-500/50 hover:bg-sky-500/10 hover:text-sky-400', svg: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> },
              { href: 'https://instagram.com', label: 'Instagram', cls: 'hover:border-pink-500/50 hover:bg-pink-500/10 hover:text-pink-400', svg: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg> },
              { href: 'https://facebook.com', label: 'Facebook', cls: 'hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400', svg: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg> },
              { href: 'https://discord.gg/snyprr', label: 'Discord', cls: 'hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-400', svg: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg> },
            ].map((s) => (
              <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                className={`w-9 h-9 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center justify-center transition-all ${s.cls}`}>
                {s.svg}
              </a>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <a href="#pricing" className="hover:text-[var(--text-primary)] transition-colors">Pricing</a>
          <Link to="/about" className="hover:text-[var(--text-primary)] transition-colors">About Us</Link>
          <Link to="/testimonials" className="hover:text-[var(--text-primary)] transition-colors">Testimonials</Link>
          <Link to="/contact-us" className="hover:text-[var(--text-primary)] transition-colors">Contact Us</Link>
          <Link to="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms &amp; Conditions</Link>
          <Link to="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</Link>
          <Link to="/risk-disclosure" className="hover:text-[var(--text-primary)] transition-colors">Risk Disclosure</Link>
          <Link to="/login" className="hover:text-[var(--text-primary)] transition-colors">Sign In</Link>
          <Link to="/signup" className="hover:text-[var(--text-primary)] transition-colors">Create Account</Link>
        </div>
        <p className="max-w-3xl mx-auto leading-relaxed text-[11px] text-[var(--text-muted)]">
          © {new Date().getFullYear()} Snyprr.ai. All rights reserved. Snyprr.ai provides market analysis setups for educational and informational purposes only.
          Nothing on this platform constitutes financial advice, investment advice, or a recommendation to buy or sell any financial instrument.
          Trading financial markets involves substantial risk of loss and may not be suitable for all users.
          Past performance of published setups does not guarantee future results.
        </p>
      </footer>

      <LandingChatbot />
    </div>
  );
}
