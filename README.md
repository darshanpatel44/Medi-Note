# MediNote

<p align="center">
  <a href="https://medinote-three.vercel.app/">Live Demo</a> •
  <a href="#overview">Overview</a> •
  <a href="#key-features">Key Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#setup">Setup</a> •
  <a href="#authors">Authors</a>
</p>

## Overview

MediNote is an AI-powered platform that records and transcribes doctor-patient conversations, generates formatted reports with tailored clinical trial recommendations, and enables patients to chat with their previous meeting reports.

The platform addresses several critical problems in healthcare:
- **Note-taking distractions** during patient consultations
- **Clinical trials that slip through** due to manual matching processes
- **Administrative overhead** that consumes valuable clinical time
- **Lack of easy follow-up** for patients after appointments

## Key Features

- **Live Audio Capture & Transcription**: Record and automatically transcribe medical consultations in real-time
- **Auto-Generated Structured Reports**: Convert conversations into professionally formatted medical reports
- **Intelligent Clinical Trial Recommendations**: Match patients with relevant clinical trials based on conversation data
- **AI-Chat Follow-up**: Allow patients to interact with their medical records through a conversational AI interface
- **Secure HIPAA-Compliant Platform**: Maintain patient privacy with enterprise-grade security measures

## Target Users

- **Hospitals** seeking to improve documentation efficiency
- **Physicians** looking to reduce administrative burden
- **Patients** wanting better access to their medical information

## Impact

MediNote lightens clinicians' administrative load and ensures precise documentation, while empowering patients with seamless, 24/7 access to their visit transcripts and compassionate, AI-driven follow-up.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI Components**: Radix UI + TailwindCSS
- **Authentication**: Clerk
- **Database**: Convex (real-time database)
- **Storage**: Convex
- **Deployment**: Vercel

## Setup

1. Clone the repository
```bash
git clone [repository-url]
cd MediNote
```

2. Install dependencies
```bash
npm i
```

3. Copy the example environment variables file
```bash
cp .env.example .env
```

4. Fill in the environment variables in the `.env` file with your actual values

5. Start the development server
```bash
npm run dev
```

6. Start the Convex backend
```bash
npx convex dev
```

## Running in Production

To build for production:
```bash
npm run build
```

To preview the production build:
```bash
npm run preview
```

## Authors

- **Neel Patel** 
- **Darshan Patel** 


<p align="center">
  <a href="https://medinote-three.vercel.app/">Visit MediNote</a>
</p>