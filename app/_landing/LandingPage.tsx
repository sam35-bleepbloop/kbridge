'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
import s from './landing.module.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600', '700'],
})

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  variable: '--font-dm-serif',
  weight: ['400'],
  style: ['normal', 'italic'],
})

// ── FAQ DATA ──────────────────────────────────────────────
const faqs = [
  {
    q: 'What is K-Bridge?',
    a: 'K-Bridge is a bilingual concierge and payment coordination platform designed specifically for U.S. military, government personnel, and contractors living in South Korea under SOFA status. We help you access Korean services, make local payments, and navigate everyday challenges — all in English, from your phone or computer.',
  },
  {
    q: 'Does K-Bridge hold my money?',
    a: 'No — and this is by design. Your funds move directly from your U.S. bank account or card to the Korean vendor\'s bank account via licensed payment rails (Nium ACH + KRW, Stripe card) with full KYC/AML compliance. K-Bridge is a registered federal MSB — 100% compliant with U.S. financial regulations.',
  },
  {
    q: 'What are Bridge Tokens?',
    a: 'Tokens are K-Bridge\'s unit of service — they cover the technology, coordination, Korean-language communication, and bilingual team time that goes into completing your task. Each token costs $1.50. Simple tasks like an inquiry cost 1–3 tokens; complex tasks like setting up a new recurring payment cost 10 tokens. You\'re always shown the estimated cost before you confirm.',
  },
  {
    q: 'Do I need a subscription?',
    a: 'No subscription required. K-Bridge is fully pay-as-you-go. You purchase token packs when you need them — Single ($2.00/token), Starter (10 tokens for $19), Standard (25 tokens for $45), or Value (50 tokens for $85). You\'ll also receive 5 free tokens when you sign up, enough to try the platform.',
  },
  {
    q: 'How does K-Bridge save me money?',
    a: 'By paying vendors directly in KRW at local Korean prices, you avoid the hidden currency exchange markups that come from exchanging USD cash at a bank, using a U.S. card abroad, or going through third-party services with high conversion fees. Our facilitation fee is transparent and fixed: 1.5% via bank transfer (min $5) or 4.0% for instant card/wallet payments (min $5).',
  },
  {
    q: 'What happens if a task requires a human?',
    a: 'Some tasks — like verifying a traffic ticket amount with a local government office — require a Korean-speaking team member to make a call. When this happens, K-Bridge notifies you immediately and provides a 2-business-hour response window. Human involvement is reflected in the token cost estimate, so there are no surprises.',
  },
  {
    q: 'Is K-Bridge only for Camp Humphreys?',
    a: 'No — K-Bridge is available to any SOFA-status U.S. military, government, or contractor personnel in South Korea. Camp Humphreys is our primary launch market given the concentration of personnel there, but we serve users across the peninsula including Osan, Kunsan, Yongsan, and beyond.',
  },
]

// ── COMPONENT ─────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const fadeRefs = useRef<HTMLElement[]>([])

  // Nav scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Intersection observer for fade-up animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add(s.fadeUpVisible)
      }),
      { threshold: 0.1 }
    )
    document.querySelectorAll(`.${s.fadeUp}`).forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i)

  return (
    <div className={`${s.page} ${dmSans.variable} ${dmSerif.variable}`}>

      {/* ── NAV ── */}
      <nav className={`${s.nav} ${scrolled ? s.navScrolled : ''}`}>
        <Link href="/" className={s.navLogo}>
          <Image src="/logo.png" alt="K-Bridge logo" width={36} height={36} style={{ borderRadius: '50%' }} />
          <span className={s.navLogoText}>K-Bridge</span>
        </Link>
        <ul className={s.navLinks}>
          <li><a href="#benefits">Benefits</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#services">Services</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        <div className={s.navCta}>
          <Link href="/auth/login" className={s.btnGhost}>Login</Link>
          <Link href="/auth/signup" className={s.btnPrimary}>Get started →</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={s.hero}>
        <div className={s.heroLeft}>
          <div className={s.heroEyebrow}>
            <span className={s.eyebrowDot} />
            Built for U.S. military &amp; SOFA personnel
          </div>
          <h1 className={s.heroH1}>
            We remove the barriers.<br />
            You <em>enjoy Korea</em><br />
            to the fullest.
          </h1>
          <p className={s.heroSub}>
            K-Bridge is your English-speaking concierge for life in Korea. Pay Korean bills, resolve
            traffic tickets, and access local services — all without touching a Korean bank account.
          </p>
          <div className={s.heroActions}>
            <Link href="/auth/signup" className={s.btnHero}>Start for free →</Link>
            <a href="#how" className={s.btnHeroGhost}>See how it works</a>
          </div>
          <p className={s.heroNudge}>🎁 Get 5 free tokens just for signing up — no card required.</p>
          <div className={s.heroStatsBar}>
            <div className={s.heroStats}>
              <div className={s.heroStat}>
                <strong>$1.50</strong>
                <span>per token, flat rate</span>
              </div>
              <div className={s.heroStat}>
                <strong>1–50</strong>
                <span>tokens per task</span>
              </div>
              <div className={s.heroStat}>
                <strong>100%</strong>
                <span>MSB compliant</span>
              </div>
            </div>
          </div>
        </div>

        <div className={s.heroRight}>
          <svg className={s.heroBgCircles} viewBox="0 0 700 700" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
            <circle cx="600" cy="100" r="300" fill="white" />
            <circle cx="100" cy="600" r="250" fill="white" />
            <circle cx="350" cy="350" r="180" fill="white" />
          </svg>
          <div className={s.heroLogoBadge}>
            <Image src="/logo.png" alt="K-Bridge" width={64} height={64} style={{ objectFit: 'cover' }} />
          </div>
          <div className={s.heroCardStack}>
            <div className={s.welcomeBadge}>✦ Serving Camp Humphreys &amp; beyond</div>
            <div className={s.heroCard}>
              <div className={s.heroCardLabel}>Active task</div>
              <div className={s.heroCardTitle}>Monthly rent — Kim Jae-won</div>
              <div className={s.heroCardSub}>₩1,200,000 · via bank route · 1.5% fee</div>
              <div className={s.heroCardStatus}><span className={s.dotGreen} /> Scheduled for the 1st</div>
            </div>
            <div className={s.heroCard}>
              <div className={s.heroCardLabel}>One-off payment</div>
              <div className={s.heroCardTitle}>Traffic ticket — Osan-si</div>
              <div className={s.heroCardSub}>₩60,000 · scanned &amp; verified · 5 tokens</div>
              <div className={s.heroCardStatus}><span className={s.dotAmber} /> Employee verifying</div>
            </div>
            <div className={s.heroCard} style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className={s.heroCardLabel}>Your token balance</div>
              <div className={`${s.heroCardTitle} ${s.balanceTitle}`}>24 tokens</div>
              <div className={s.heroCardSub}>≈ 8 recurring executions remaining</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className={`${s.section} ${s.benefits}`} id="benefits">
        <div className={`${s.sectionHeaderCenter} ${s.fadeUp}`}>
          <div className={s.sectionEyebrow}>Why K-Bridge</div>
          <h2 className={s.sectionTitle}>Life in Korea, finally on your terms.</h2>
          <p className={s.sectionSub}>
            Feel like Korea&apos;s conveniences are just out of reach? We&apos;re here to bridge
            the gap — so you can focus on the mission, not the logistics.
          </p>
        </div>
        <div className={s.benefitsGrid}>
          {[
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              ),
              title: 'Navigate Korea with Confidence',
              body: 'Stop second-guessing every payment and call. With K-Bridge behind you, every choice in Korea feels easy — even the ones entirely in Korean.',
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              ),
              title: 'Save Your Time, Money & Energy',
              body: 'Skip the bank and currency exchange lines. Keep more of your hard-earned cash by paying local prices directly — no middlemen, no markups beyond our transparent fee.',
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              ),
              title: 'Be the One with Connections',
              body: "Everyone will wonder how you make life in Korea look so easy. Keep it as your little secret, or be the hero who lets others in on it.",
            },
          ].map((card, i) => (
            <div key={i} className={`${s.benefitCard} ${s.fadeUp}`} style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className={s.benefitIcon}>{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className={`${s.section} ${s.how}`} id="how">
        <div className={`${s.sectionHeaderCenter} ${s.fadeUp}`}>
          <div className={s.sectionEyebrow}>How it works</div>
          <h2 className={s.sectionTitle}>You&apos;re in control. We do the heavy lifting.</h2>
          <p className={s.sectionSub}>
            Four simple steps from request to done — smart technology handles the routine,
            our bilingual team handles the rest.
          </p>
        </div>
        <div className={`${s.steps} ${s.fadeUp}`}>
          {[
            { n: '1', title: 'Send your request', body: 'Use the chat in your dashboard to describe what you need in plain English.' },
            { n: '2', title: 'Approve your token quote', body: "We show you the exact token cost upfront. You say go — no hidden surprises." },
            { n: '3', title: 'We handle the task', body: 'Smart technology streamlines the work. When a task needs a personal touch, our bilingual team steps in.' },
            { n: '4', title: 'Give final confirmation', body: "You confirm the final payment details. Then keep enjoying life — we'll handle the rest." },
          ].map((step) => (
            <div key={step.n} className={s.step}>
              <div className={s.stepNum}>{step.n}</div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className={`${s.section} ${s.services}`} id="services">
        <div className={`${s.sectionHeaderCenter} ${s.fadeUp}`}>
          <div className={s.sectionEyebrow}>What we handle</div>
          <h2 className={s.sectionTitle}>More than just bills.</h2>
          <p className={s.sectionSub}>
            K-Bridge tackles the recurring friction of life in Korea — from automated monthly
            payments to one-off headaches like traffic tickets.
          </p>
        </div>
        <div className={`${s.servicesGrid} ${s.fadeUp}`}>
          <div className={s.serviceItem}>
            <span className={s.serviceTag}>Recurring payments</span>
            <h3>Automate Local Bills</h3>
            <p>Set it up once, approve the first run, then forget about it. K-Bridge handles every subsequent payment automatically.</p>
            <ul className={s.serviceList}>
              <li>Rent &amp; utilities</li>
              <li>Korean phone plans</li>
              <li>Daycare &amp; afterschool activities</li>
              <li>Hi-Pass &amp; T-Money recharges</li>
            </ul>
          </div>
          <div className={s.serviceItem}>
            <span className={s.serviceTag}>One-off payments</span>
            <h3>Traffic Tickets &amp; Ad-Hoc Bills</h3>
            <p>Got a ticket in the mail? Upload a photo. We&apos;ll scan and read it, verify the amount with local authorities, and pay it on your behalf.</p>
            <ul className={s.serviceList}>
              <li>Traffic fine resolution</li>
              <li>Monthly ticket monitoring</li>
              <li>Appeal assistance</li>
              <li>Any one-off Korean payment</li>
            </ul>
          </div>
          <div className={s.serviceItem}>
            <span className={s.serviceTag}>Concierge service</span>
            <h3>Ask Anything</h3>
            <p>Not sure if we can help? Just ask. We&apos;ll clarify, quote a token cost, and handle it — with a real bilingual team member whenever the task needs a human touch.</p>
            <ul className={s.serviceList}>
              <li>Korean-language vendor calls</li>
              <li>Price research &amp; comparisons</li>
              <li>Translation &amp; communication</li>
              <li>Custom task coordination</li>
            </ul>
          </div>
          <div className={s.serviceItem}>
            <span className={s.serviceTag}>Payment infrastructure</span>
            <h3>Direct. Safe. Transparent.</h3>
            <p>Your money goes directly from your U.S. bank to the Korean vendor. K-Bridge never holds funds — we just orchestrate.</p>
            <ul className={s.serviceList}>
              <li>Bank route: 1.5% fee (min $5)</li>
              <li>Card/wallet route: 4.0% fee (min $5)</li>
              <li>Full payment memo to vendor</li>
              <li>100% MSB compliant — fully regulated</li>
            </ul>
          </div>
        </div>
        <div className={`${s.servicesCta} ${s.fadeUp}`}>
          <Link href="/auth/signup" className={s.btnWhite}>Activate my K-Bridge account →</Link>
          <p className={s.servicesNudge}>This is just the start. More services launching through 2026.</p>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className={`${s.section} ${s.testimonials}`} id="testimonials">
        <div className={`${s.sectionHeaderCenter} ${s.fadeUp}`}>
          <div className={s.sectionEyebrow}>From the community</div>
          <h2 className={s.sectionTitle}>What people are saying.</h2>
          <p className={s.sectionSub}>Early users from Camp Humphreys who helped us build the platform.</p>
        </div>
        <div className={s.testimonialsGrid}>
          {[
            {
              initials: 'JR', name: 'J. Reynolds', role: 'Staff Sergeant, Camp Humphreys',
              quote: 'I used to drive 20 minutes to the nearest KEB Hana branch every month just to pay rent. Now I tap a button and it\'s done. I honestly cannot believe this wasn\'t available years ago.',
            },
            {
              initials: 'MT', name: 'M. Torres', role: 'GS-12 Civilian, Pyeongtaek',
              quote: 'Got a traffic ticket notice that was entirely in Korean. K-Bridge translated it, confirmed the amount with the local office, and paid it — all while I was at PT. Unreal.',
            },
            {
              initials: 'SC', name: 'S. Cho', role: 'DoD Contractor, Osan Air Base',
              quote: 'My landlord only communicates in Korean. K-Bridge handles every message, every payment, every question — and I always know exactly what\'s being said and done. Total peace of mind.',
            },
          ].map((t, i) => (
            <div key={i} className={`${s.testimonialCard} ${s.fadeUp}`} style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className={s.testimonialStars}>★★★★★</div>
              <p className={s.testimonialText}>&ldquo;{t.quote}&rdquo;</p>
              <div className={s.testimonialAuthor}>
                <div className={s.testimonialAvatar}>{t.initials}</div>
                <div>
                  <div className={s.testimonialName}>{t.name}</div>
                  <div className={s.testimonialRole}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className={`${s.section} ${s.pricing}`} id="pricing">
        <div className={`${s.sectionHeaderCenter} ${s.pricingIntro} ${s.fadeUp}`}>
          <div className={s.sectionEyebrow}>Pricing</div>
          <h2 className={s.sectionTitle}>Simple, transparent, pay-as-you-go.</h2>
          <p className={s.sectionSub} style={{ margin: '0 auto' }}>
            We use Bridge Tokens to keep pricing simple and transparent.<br />
            <span style={{ whiteSpace: 'nowrap', display: 'inline-block', marginTop: '6px' }}>
              No subscriptions.&nbsp;&nbsp;No hidden fees.&nbsp;&nbsp;No unpleasant surprises.
            </span>
          </p>
        </div>
        <div className={`${s.tokenExplainer} ${s.fadeUp}`}>
          {[
            { value: '$1.50', label: 'per token, flat rate' },
            { value: '5 free', label: 'tokens on signup' },
            { value: '3 tokens', label: 'typical recurring execution' },
            { value: '10 tokens', label: 'recurring setup (any type)' },
            { value: '1–3 tokens', label: 'inquiry / quote only' },
          ].map((fact, i) => (
            <Fragment key={fact.label}>
              {i > 0 && <div className={s.tokenDivider} />}
              <div className={s.tokenFact}>
                <strong>{fact.value}</strong>
                <span>{fact.label}</span>
              </div>
            </Fragment>
          ))}
        </div>
        <div className={`${s.packsGrid} ${s.fadeUp}`}>
          {[
            { name: 'Starter', price: '$19', tokens: '10 tokens', popular: false, features: ['Set up 1 recurring payment', 'Handle a traffic ticket', 'Ask a few questions'] },
            { name: 'Standard', price: '$45', tokens: '25 tokens', popular: true, features: ['2–3 recurring setups', '~8 monthly executions', 'Room for one-off tasks'] },
            { name: 'Value', price: '$85', tokens: '50 tokens', popular: false, features: ['Full month, fully covered', 'Multiple recurring setups', 'One-off tasks included'] },
          ].map((pack) => (
            <div key={pack.name} className={`${s.packCard} ${pack.popular ? s.packCardPopular : ''}`}>
              {pack.popular && <div className={s.packBadge}>Most popular</div>}
              <div className={s.packName}>{pack.name}</div>
              <div className={s.packPrice}>{pack.price}</div>
              <div className={s.packTokens}><strong>{pack.tokens}</strong></div>
              <ul className={s.packFeatures}>
                {pack.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <Link href="/auth/signup" className={`${s.btnPack} ${pack.popular ? s.btnPackPopular : ''}`}>
                Get started
              </Link>
            </div>
          ))}
        </div>
        <p className={s.pricingNote}>
          All prices in USD. Payment facilitation fees are separate and displayed clearly before you confirm.{' '}
          <strong>Bank route: 1.5% | Card route: 4.0%</strong> (min $5).
        </p>
        <div className={`${s.burnTable} ${s.fadeUp}`}>
          <h3>What tasks cost</h3>
          {[
            { label: 'Recurring setup (any service)', cost: '10 tokens' },
            { label: 'Recurring execution (automatic)', cost: '3 tokens' },
            { label: 'One-off payment (handled for you)', cost: '5–8 tokens' },
            { label: 'Traffic ticket (standard)', cost: '8–12 tokens' },
            { label: 'Inquiry / quote only', cost: '1–3 tokens' },
            { label: 'Complex coordination', cost: '25–50 tokens' },
          ].map((row) => (
            <div key={row.label} className={s.burnRow}>
              <span className={s.burnLabel}>{row.label}</span>
              <span className={s.burnCost}>{row.cost}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className={`${s.section} ${s.faq}`} id="faq">
        <div className={`${s.sectionHeaderCenter} ${s.fadeUp}`}>
          <div className={s.sectionEyebrow}>FAQ</div>
          <h2 className={s.sectionTitle}>Frequently asked questions.</h2>
          <p className={s.sectionSub} style={{ margin: '0 auto' }}>Still not convinced? Check out our answers below.</p>
        </div>
        <div className={`${s.faqList} ${s.fadeUp}`}>
          {faqs.map((faq, i) => (
            <div key={i} className={s.faqItem}>
              <button className={s.faqQuestion} onClick={() => toggleFaq(i)}>
                {faq.q}
                <span className={`${s.faqIcon} ${openFaq === i ? s.faqIconOpen : ''}`}>+</span>
              </button>
              <div
                className={`${s.faqAnswer} ${openFaq === i ? s.faqAnswerOpen : ''}`}
                style={{ maxHeight: openFaq === i ? '400px' : '0' }}
              >
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
        <p className={s.faqMore}>
          Have more questions?{' '}
          <Link href="/auth/signup" className={s.faqMoreLink}>
            Sign up and ask our team directly
          </Link>{' '}
          — the first few tokens are on us.
        </p>
      </section>

      {/* ── CTA BANNER ── */}
      <section className={s.ctaBanner}>
        <svg className={s.ctaBannerBg} viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <circle cx="1100" cy="50" r="300" fill="white" />
          <circle cx="100" cy="350" r="250" fill="white" />
        </svg>
        <h2>You&apos;ve made it this far.<br />Don&apos;t stop now.</h2>
        <p className={s.ctaBannerSub}>
          Join hundreds of SOFA-status personnel who&apos;ve stopped fighting Korea&apos;s payment
          barriers. Sign up in under 2 minutes and get 5 free tokens to start.
        </p>
        <div className={s.ctaBannerActions}>
          <Link href="/auth/signup" className={s.btnWhite}>Create my free account →</Link>
        </div>
        <p className={s.ctaNudge}>Signup is quick and easy. Customize your profile later for even better support.</p>
      </section>

      {/* ── FOOTER ── */}
      <footer className={s.footer}>
        <div className={s.footerTop}>
          <div className={s.footerBrand}>
            <div className={s.footerLogo}>
              <Image src="/logo.png" alt="K-Bridge" width={32} height={32} style={{ borderRadius: '50%' }} />
              <span className={s.footerLogoText}>K-Bridge</span>
            </div>
            <p>Your bilingual concierge for life in South Korea. Built for the SOFA-status community at Camp Humphreys and beyond.</p>
          </div>
          <div className={s.footerLinks}>
            <h4>Platform</h4>
            <ul>
              <li><a href="#benefits">Benefits</a></li>
              <li><a href="#how">How it works</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div className={s.footerLinks}>
            <h4>Account</h4>
            <ul>
              <li><Link href="/auth/signup">Sign up</Link></li>
              <li><Link href="/auth/login">Login</Link></li>
              <li><Link href="/tokens">Buy tokens</Link></li>
            </ul>
          </div>
          <div className={s.footerLinks}>
            <h4>Legal</h4>
            <ul>
              <li><Link href="#">Privacy Policy</Link></li>
              <li><Link href="#">Terms of Service</Link></li>
              <li><Link href="#">Service Agreement</Link></li>
              <li><Link href="#">Contact us</Link></li>
            </ul>
          </div>
        </div>
        <div className={s.footerBottom}>
          <p>© 2025 K-Bridge. All rights reserved.</p>
          <div className={s.footerLegal}>
            <Link href="#">Privacy</Link>
            <Link href="#">Terms</Link>
            <Link href="#">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
