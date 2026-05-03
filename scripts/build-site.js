#!/usr/bin/env node

const { buildSite } = require('./site-core');

buildSite({ root: process.cwd() }).catch((error) => {
  console.error(error);
  process.exit(1);
});
