#!/bin/bash
deployment_url=$(npx vercel deploy --prebuilt --prod)

npx vercel alias $deployment_url gen2.eecircuit.com