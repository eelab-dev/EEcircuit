#!/bin/bash
deployment_url=$(npx vercel deploy --prebuilt)

npx vercel alias $deployment_url gen2.eecircuit.com