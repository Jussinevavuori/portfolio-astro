---
title: Nexpenda
description: Web application for tracking personal finances, initially created for personal use to replace Excel and provide myself a mobile interface.
image: /content/projects/nexpenda.png
technologies:
  [
    "Typescript",
    "React",
    "Next.js",
    "Stripe",
    "Express",
    "Prisma",
    "PostgreSQL",
    "Node.js",
    "Google Cloud",
    "Heroku",
    "Vercel",
    "Redux",
    "Docker",
    "TailwindCSS",
  ]
projectUrl: "https://nexpenda.com"
githubUrl: https://github.com/Jussinevavuori/nexpenda-next
startDate: 2020-06-01
endDate: 2022-12-31
priority: 5
hasPage: true
type: personal
teamSize: 1
---

# Nexpenda - Personal finance tracking application

## The Problem

For many years I've kept track of my incomes and expenses, stored them in an Excel spreadsheet and fiddled around with multiple Excel features to get all the data visualisation and filtering I want.

However, on the go I couldn't update the spreadsheet. Sure, I could have saved the spreadsheet to the cloud and accessed it with the mobile Excel app (where janky and slow is only beginning to describe the experience). Additionally, I was starting to run into problems attempting to visualise the dataset in specific ways. So I did what any sensible developer with too much free time would do - create your own application.

## The solution

I ended up calling the web application slowly formed throughout the process Nexpenda. It is an application that focuses on several core features:

1. Provide a fast, intuitive and highly responsive UI to make it as easy as possible to log your incomes and expenses, even on the go.
1. Make filtering by time period as intuitive as possible, other searching and filtering comes second.
1. Automatically generate analytics and data visualisation from your data for the selected time period.

Focusing on this small feature set enabled me to keep working on the project on the side and keep on polishing the existing features.

The web app has completely different user interfaces depending on the device it is being used on and adapts itself to both desktop and mobile use. For mobile devices, the app is also installable as a PWA to enable native-like feeling with minimal effort.

The app and its backend have been transitioned from create-react-app and express over to Next.js, while large features have been dropped due to lack of time to personally develop them. These features include monetization with premium user subscriptions created with Stripe and a budget management feature. However, the latter might just resurface given enough time.
