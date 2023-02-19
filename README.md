# Typesafe REST API Specification - Generic Extras Libraries

[![CI Pipeline](https://github.com/ty-ras/extras/actions/workflows/ci.yml/badge.svg)](https://github.com/ty-ras/extras/actions/workflows/ci.yml)
[![CD Pipeline](https://github.com/ty-ras/extras/actions/workflows/cd.yml/badge.svg)](https://github.com/ty-ras/extras/actions/workflows/cd.yml)

The Typesafe REST API Specification is a family of libraries used to enable seamless development of Backend and/or Frontend which communicate via HTTP protocol.
The protocol specification is checked both at compile-time and run-time to verify that communication indeed adhers to the protocol.
This all is done in such way that it does not make development tedious or boring, but instead robust and fun!

This particular repository contains generic libraries which are not strictly required when creating apps utilizing TyRAS libraries, but which may be of great use:
- [cache](./cache) contains lightweight caching mechanisms for caching values which are obtainable via async call and thus may be somewhat expensive to re-calculate every time.
- [main](./main) contains library which makes it easier to execute entrypoint asynchronous main functions (e.g. non-ESM context), and
- [resource-pool](./resource-pool) contains generic resource pool API and implementation, based on creation and destruction asynchronous callbacks.
