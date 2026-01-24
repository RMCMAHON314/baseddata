import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Zap, Building2, Rocket, Crown, Home } from 'lucide-react';

const plans = [
  {
    id: 'free',
    name: 'Free',
    icon: <Zap />,
    price: 0,
    description: 'Get started with basic access',
    features: [
      { text: '10 searches/month', included: true },
      { text: '3 saved searches', included: true },
      { text: '1 alert', included: true },
      { text: 'API access', included: false },
      { text: 'PDF exports', included: false },
      { text: 'Team members', included: false },
    ],
    cta: 'Get Started Free',
    popular: false
  },
  {
    id: 'starter',
    name: 'Starter',
    icon: <Rocket />,
    price: 99,
    description: 'For individuals and consultants',
    features: [
      { text: '100 searches/month', included: true },
      { text: '25 saved searches', included: true },
      { text: '10 alerts', included: true },
      { text: 'API access', included: false },
      { text: 'PDF exports', included: true },
      { text: '3 team members', included: true },
    ],
    cta: 'Start Free Trial',
    popular: false
  },
  {
    id: 'professional',
    name: 'Professional',
    icon: <Building2 />,
    price: 499,
    description: 'For growing businesses',
    features: [
      { text: '1,000 searches/month', included: true },
      { text: '100 saved searches', included: true },
      { text: '50 alerts', included: true },
      { text: 'Full API access', included: true },
      { text: 'PDF exports', included: true },
      { text: '10 team members', included: true },
    ],
    cta: 'Start Free Trial',
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: <Crown />,
    price: 2499,
    description: 'For large organizations',
    features: [
      { text: 'Unlimited searches', included: true },
      { text: 'Unlimited saved searches', included: true },
      { text: 'Unlimited alerts', included: true },
      { text: 'Full API access', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'Unlimited team members', included: true },
      { text: 'Dedicated support', included: true },
      { text: 'SLA guarantee', included: true },
    ],
    cta: 'Contact Sales',
    popular: false
  }
];

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" /> Home
          </Button>
        </div>

        <div className="text-center mb-16">
          <Badge className="bg-primary/20 text-primary mb-4">PRICING</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free and scale as you grow. No hidden fees, no surprises.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`bg-card border-border relative ${
                plan.popular ? 'border-primary ring-2 ring-primary/20' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  {React.cloneElement(plan.icon, { className: 'w-6 h-6 text-primary' })}
                  <CardTitle>{plan.name}</CardTitle>
                </div>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <X className="w-5 h-5 text-muted-foreground/50" />
                      )}
                      <span className={feature.included ? '' : 'text-muted-foreground/50'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-primary hover:bg-primary/90' 
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => {
                    if (plan.id === 'enterprise') {
                      window.location.href = 'mailto:sales@baseddata.io';
                    } else {
                      navigate('/?signup=true&plan=' + plan.id);
                    }
                  }}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust indicators */}
        <div className="mt-20 text-center">
          <p className="text-muted-foreground mb-4">Trusted by leading organizations</p>
          <div className="flex justify-center items-center gap-8 opacity-50">
            <span className="text-2xl font-bold">BCPS</span>
            <span className="text-2xl font-bold">MEEC</span>
            <span className="text-2xl font-bold">Maryland.gov</span>
          </div>
        </div>
      </div>
    </div>
  );
}
