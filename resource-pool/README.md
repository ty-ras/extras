# Typesafe REST API Specification Extras - Resource Pool

[![Coverage](https://codecov.io/gh/ty-ras/extras/branch/main/graph/badge.svg?flag=resource-pool)](https://codecov.io/gh/ty-ras/extras)

This folder contains library which exposes function to create `ResourcePool`s which are operating on asynchronous creation and destruction callbacks.
The function returns separate `ResourcePoolAdministration` object, which can be used to run eviction cycle and request pool parameters.
In the future, the `ResourcePoolAdministration` will be expanded to also modify the pool parameters at runtime, enabling varying resource pool configration based on e.g. certain schedule.
