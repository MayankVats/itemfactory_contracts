import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { ItemFactory } from "../src/types/ItemFactory";
import { Milk } from "../src/types/Milk";

let deployer: SignerWithAddress;

let addrs: SignerWithAddress[];

async function main() {
  [deployer, ...addrs] = await ethers.getSigners();

  let CONTRACT_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("CONTRACT_ROLE")
  );

  // Deploy Milk Factory
  let Instance = await ethers.getContractFactory("Milk");
  const Milk: Milk = (await Instance.deploy("Milk", "MILK")) as Milk;

  console.log("Milk Deployed at: ", Milk.address);

  // Deploy ItemFactory
  Instance = await ethers.getContractFactory("ItemFactory");
  const ItemFactory: ItemFactory = (await Instance.deploy(
    "<URI_HERE>",
    Milk.address
  )) as ItemFactory;

  console.log("ItemFactory Deployed at: ", ItemFactory.address);

  // Set CONTRACT_ROLE in Milk
  await Milk.grantRole(CONTRACT_ROLE, ItemFactory.address);

  const hasRole = await Milk.hasRole(CONTRACT_ROLE, ItemFactory.address);
  if (hasRole) {
    console.log("CONTRACT_ROLE given to: ", ItemFactory.address);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
