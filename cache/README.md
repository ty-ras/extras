# Typesafe REST API Specification Extras - Async Value Caching

[![Coverage](https://codecov.io/gh/ty-ras/extras/branch/main/graph/badge.svg?flag=cache)](https://codecov.io/gh/ty-ras/extras)

This folder contains functions which allow creation of objects usable for caching asynchronously (via `Promise`) acquireable values.
The module entrypoints are `createInMemoryAsyncCache` for caching anything which has a `string` key.
Additionally, `createInMemoryBiDiAsyncCache` is also exposed, for bidirectionally caching `string`s which are both keys and values, and are both unique.
