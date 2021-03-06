# Cool Cats Solidity Test

This repo contains a number of mistakes and places where improvements can be made. Please made any adjustments you see fit.
We have deliberately made some very silly mistakes and simple things like file names might be wrong or inconsistent.

### ERC1155SupplyCC

Why was this file used and not used directly from the OpenZepplin library?

- ERC1155SupplyCC inherits openzeppelin ERC1155 implementation, and also implements logic for special cases of zero address which runs before any token transfer.

- Basically we are burning and minting the tokens(that is manipulating \_totalSupply defined in the contract) based on whether the zero address is provided to "from" or "to".

### Claim()

Please adjust the claim function so that an address can only claim once per day.

- Done: added an address to uint256 mapping of lastClaimTime.

## Unit Tests

At Cool Cats we write unit tests for 100% coverage and for as many edge cases as we can think of. Please do the same here.

- Done: 100% Test Coverage for Milk
- Done: 80% Test Coverage for ItemFactory

## Deployment Script/Task

Please create a deployment script or task. Which ever you feel is most appropriate

- Done: Created the deployment script
