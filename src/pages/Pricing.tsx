import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Zap, Building2, Crown, ArrowRight, ChevronDown } from 'lucide-react';
import { GlobalLayout } from '@/components/layout/GlobalLayout';
import { PageSEO } from '@/components/layout/PageSEO';
import { motion } from 'framer-motion';

const plans = [
  {
    id: 'free',
    name: 'Free',
    icon: Zap,
    price: '$0',
    period: '/month',
    description: 'Get started with basic access',
    features: [
      { text: '100 entity views/month', included: true },
      { text: 'Basic search', included: true },
      { text: '10 AI queries/day', included: true },
      { text: 'Single user', included: true },
      { text: 'Saved searches', included: false },
      { text: 'Contract alerts', included: false },
      { text: 'Data export', included: false },
      { text: 'API access', included: false },
    ],
    cta: 'Start Free',
    popular: false,
    href: '/onboarding',
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Building2,
    price: '$99',
    period: '/month',
    annual: '$990/year (save $198)',
    description: 'For BD professionals and analysts',
    features: [
      { text: 'Unlimited entity views', included: true },
      { text: 'Advanced search + saved searches', included: true },
      { text: '100 AI queries/day', included: true },
      { text: 'Contract expiration alerts', included: true },
      { text: 'Opportunity matching', included: true },
      { text: 'Data export (CSV, JSON, XLSX)', included: true },
      { text: 'Priority support', included: true },
      { text: 'API access', included: false },
    ],
    cta: 'Start Free Trial',
    popular: true,
    href: '/onboarding',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Crown,
    price: 'Custom',
    period: '',
    description: 'For teams and large organizations',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Full API access (developer-api)', included: true },
      { text: 'Custom alerts + webhooks', included: true },
      { text: 'Dedicated account support', included: true },
      { text: 'Team seats (5 included)', included: true },
      { text: 'Custom data coverage requests', included: true },
      { text: 'SLA guarantee', included: true },
      { text: 'SSO integration', included: true },
    ],
    cta: 'Contact Sales',
    popular: false,
    href: 'mailto:sales@baseddata.io',
  },
];

const COMPARISON = [
  { feature: 'Entity views', free: '100/mo', pro: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Search', free: 'Basic', pro: 'Advanced + Saved', enterprise: 'Advanced + Saved' },
  { feature: 'AI queries', free: '10/day', pro: '100/day', enterprise: 'Unlimited' },
  { feature: 'Users', free: '1', pro: '1', enterprise: '5 included' },
  { feature: 'Contract alerts', free: '—', pro: '✓', enterprise: '✓' },
  { feature: 'Opportunity matching', free: '—', pro: '✓', enterprise: '✓' },
  { feature: 'Data export', free: '—', pro: 'CSV, JSON, XLSX', enterprise: 'All formats' },
  { feature: 'API access', free: '—', pro: '—', enterprise: 'Full access' },
  { feature: 'Webhooks', free: '—', pro: '—', enterprise: '✓' },
  { feature: 'Support', free: 'Community', pro: 'Priority', enterprise: 'Dedicated' },
];

const FAQS = [
  { q: 'Can I try Pro features before paying?', a: 'Yes! Every account starts with a 14-day free trial of Pro features. No credit card required.' },
  { q: 'What data sources are included?', a: 'All tiers include data from USASpending.gov, SAM.gov, FPDS, SBIR, NSF, SEC EDGAR, GSA CALC+, ClinicalTrials.gov, and USPTO. Updated every 4 hours.' },
  { q: 'Can I upgrade or downgrade at any time?', a: 'Absolutely. Changes take effect immediately and are prorated.' },
  { q: 'Is there an annual discount?', a: 'Yes — Pro annual billing is $990/year, saving you $198 compared to monthly.' },
  { q: 'What does the API include?', a: 'Enterprise API access includes all endpoints: entity lookup, contract search, opportunity feed, and competitive intelligence. Full docs at /api-docs.' },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <GlobalLayout>
      <PageSEO title="Pricing — BasedData" description="Start free. Pro at $99/month. Enterprise with API access and team seats." path="/pricing" jsonLd={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "How much does BasedData cost?", "acceptedAnswer": { "@type": "Answer", "text": "BasedData offers a free tier, Pro at $99/month, and Enterprise plans with custom pricing." }},
          { "@type": "Question", "name": "What data sources does BasedData include?", "acceptedAnswer": { "@type": "Answer", "text": "BasedData aggregates data from 50+ federal sources including SAM.gov, USASpending, FPDS, SBIR, and more." }},
          { "@type": "Question", "name": "Does BasedData have an API?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, BasedData provides a RESTful API for programmatic access to government contract intelligence data." }}
        ]
      }} />
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <section className="pt-16 pb-12 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="bg-primary/10 text-primary mb-4 px-4 py-1.5">PRICING</Badge>
            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
              Simple, transparent pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free and scale as you grow. No hidden fees, no surprises.
            </p>
          </div>
        </section>

        {/* Plans */}
        <section className="px-6 pb-20">
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className={`relative h-full flex flex-col ${plan.popular ? 'border-primary ring-2 ring-primary/20 shadow-lg' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground shadow">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <plan.icon className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <div className="mt-4">
                      <span className="text-4xl font-black">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                    {plan.annual && (
                      <p className="text-xs text-muted-foreground mt-1">{plan.annual}</p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-2.5 mb-6 flex-1">
                      {plan.features.map((feature, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm">
                          {feature.included ? (
                            <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'hsl(var(--success))' }} />
                          ) : (
                            <X className="w-4 h-4 mt-0.5 text-muted-foreground/40 shrink-0" />
                          )}
                          <span className={feature.included ? '' : 'text-muted-foreground/50'}>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${plan.popular ? '' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                      variant={plan.popular ? 'default' : 'secondary'}
                      onClick={() => {
                        if (plan.id === 'enterprise') {
                          window.location.href = 'mailto:sales@baseddata.io';
                        } else {
                          navigate('/onboarding');
                        }
                      }}
                    >
                      {plan.cta} {plan.id !== 'enterprise' && <ArrowRight className="w-4 h-4 ml-1" />}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Comparison Matrix */}
        <section className="px-6 pb-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-3 text-left font-semibold">Feature</th>
                    <th className="p-3 text-center font-semibold">Free</th>
                    <th className="p-3 text-center font-semibold text-primary">Pro</th>
                    <th className="p-3 text-center font-semibold">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3 font-medium">{row.feature}</td>
                      <td className="p-3 text-center text-muted-foreground">{row.free}</td>
                      <td className="p-3 text-center font-medium">{row.pro}</td>
                      <td className="p-3 text-center text-muted-foreground">{row.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 pb-24">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {FAQS.map((faq, i) => (
                <Card key={i} className="overflow-hidden">
                  <button
                    className="w-full p-4 flex items-center justify-between text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="font-medium text-sm">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-muted-foreground">{faq.a}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>
    </GlobalLayout>
  );
}
