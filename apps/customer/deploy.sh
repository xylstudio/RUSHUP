#!/bin/bash

echo "🔄 Installing dependencies..."
npm install

echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment finished!"
