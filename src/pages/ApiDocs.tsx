import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Code, Key, Zap, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const endpoints = [
  {
    method: 'POST',
    path: '/functions/v1/omniscient',
    name: 'Search',
    description: 'Search across all entities and data sources',
    params: [
      { name: 'prompt', type: 'string', required: true, description: 'Search query' },
      { name: 'limit', type: 'number', required: false, description: 'Max results (default: 50)' },
      { name: 'filters', type: 'object', required: false, description: 'Filter criteria' }
    ],
    example: `curl -X POST https://ttzogrpnqpjtkttpupgs.supabase.co/functions/v1/omniscient \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "hospitals in Maryland", "limit": 10}'`
  },
  {
    method: 'GET',
    path: '/rest/v1/core_entities',
    name: 'List Entities',
    description: 'Get all entities with optional filters',
    params: [
      { name: 'select', type: 'string', required: false, description: 'Fields to return' },
      { name: 'limit', type: 'number', required: false, description: 'Max results' },
      { name: 'entity_type', type: 'string', required: false, description: 'Filter by type' }
    ],
    example: `curl https://ttzogrpnqpjtkttpupgs.supabase.co/rest/v1/core_entities?limit=10 \\
  -H "apikey: YOUR_ANON_KEY" \\
  -H "Authorization: Bearer YOUR_API_KEY"`
  },
  {
    method: 'GET',
    path: '/rest/v1/core_entities?id=eq.{id}',
    name: 'Get Entity',
    description: 'Get a single entity by ID',
    params: [
      { name: 'id', type: 'uuid', required: true, description: 'Entity ID' }
    ],
    example: `curl https://ttzogrpnqpjtkttpupgs.supabase.co/rest/v1/core_entities?id=eq.abc123 \\
  -H "apikey: YOUR_ANON_KEY" \\
  -H "Authorization: Bearer YOUR_API_KEY"`
  },
  {
    method: 'GET',
    path: '/rest/v1/core_facts?entity_id=eq.{id}',
    name: 'Get Entity Facts',
    description: 'Get all facts for an entity',
    params: [
      { name: 'entity_id', type: 'uuid', required: true, description: 'Entity ID' }
    ],
    example: `curl https://ttzogrpnqpjtkttpupgs.supabase.co/rest/v1/core_facts?entity_id=eq.abc123 \\
  -H "apikey: YOUR_ANON_KEY" \\
  -H "Authorization: Bearer YOUR_API_KEY"`
  },
  {
    method: 'POST',
    path: '/functions/v1/ai-chat',
    name: 'AI Chat',
    description: 'Natural language data exploration',
    params: [
      { name: 'message', type: 'string', required: true, description: 'User message' },
      { name: 'history', type: 'array', required: false, description: 'Conversation history' }
    ],
    example: `curl -X POST https://ttzogrpnqpjtkttpupgs.supabase.co/functions/v1/ai-chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Show me top healthcare contracts"}'`
  }
];

export default function ApiDocs() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Code className="w-8 h-8 text-primary" />
              API Documentation
            </h1>
            <p className="text-muted-foreground mt-2">
              Programmatic access to Based Data intelligence platform
            </p>
          </div>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
        </div>

        {/* Authentication */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-yellow-500" />
              Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              All API requests require authentication. Include your API key in the Authorization header:
            </p>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm">
              <span className="text-primary">Authorization:</span>{' '}
              <span className="text-green-400">Bearer YOUR_API_KEY</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Find your API key in{' '}
              <Link to="/dashboard" className="text-primary hover:underline">Dashboard → Settings</Link>
            </p>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-yellow-400 border-yellow-500">
                Professional: 1,000 requests/month
              </Badge>
              <Badge variant="outline" className="text-purple-400 border-purple-500">
                Enterprise: Unlimited
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <div className="space-y-6">
          {endpoints.map((endpoint, i) => (
            <Card key={i} className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <Badge className={endpoint.method === 'POST' ? 'bg-green-500' : 'bg-primary'}>
                      {endpoint.method}
                    </Badge>
                    <code className="text-lg">{endpoint.path}</code>
                  </CardTitle>
                  <span className="text-muted-foreground">{endpoint.name}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{endpoint.description}</p>
                
                {/* Parameters */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Parameters</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted-foreground">Name</th>
                        <th className="text-left py-2 text-muted-foreground">Type</th>
                        <th className="text-left py-2 text-muted-foreground">Required</th>
                        <th className="text-left py-2 text-muted-foreground">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {endpoint.params.map((param, j) => (
                        <tr key={j} className="border-b border-border/50">
                          <td className="py-2 font-mono text-primary">{param.name}</td>
                          <td className="py-2 text-purple-400">{param.type}</td>
                          <td className="py-2">
                            {param.required ? (
                              <Badge className="bg-red-500/20 text-red-400">Required</Badge>
                            ) : (
                              <Badge variant="outline">Optional</Badge>
                            )}
                          </td>
                          <td className="py-2 text-muted-foreground">{param.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Example */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Example</h4>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="font-mono text-sm text-green-400">{endpoint.example}</pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Rate Limits */}
        <Card className="bg-card border-border mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Rate Limits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2">Plan</th>
                  <th className="text-left py-2">Requests/Month</th>
                  <th className="text-left py-2">Requests/Minute</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-2">Free</td>
                  <td className="py-2">10</td>
                  <td className="py-2">1</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Starter</td>
                  <td className="py-2">100</td>
                  <td className="py-2">10</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Professional</td>
                  <td className="py-2">1,000</td>
                  <td className="py-2">60</td>
                </tr>
                <tr>
                  <td className="py-2">Enterprise</td>
                  <td className="py-2">Unlimited</td>
                  <td className="py-2">1,000</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
