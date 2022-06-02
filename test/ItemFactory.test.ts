import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractFactory } from "ethers";
import { ethers, network } from "hardhat";
import { Milk } from "../src/types/Milk";
import { ItemFactory } from "../src/types/ItemFactory";
import { expect } from "chai";

describe("Item Factory Test", function () {
  let Instance: ContractFactory;
  let Milk: Milk;
  let ItemFactory: ItemFactory;

  let DEPOSITOR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("DEPOSITOR_ROLE")
  );
  let CONTRACT_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("CONTRACT_ROLE")
  );
  let MASTER_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("MASTER_ROLE")
  );
  let ADMIN_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("ADMIN_ROLE")
  );

  let deployer: SignerWithAddress;
  let depositor: SignerWithAddress;
  let contract: SignerWithAddress;
  let master: SignerWithAddress;

  let admin: SignerWithAddress;

  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let addrs: SignerWithAddress[];

  let abiCoder = new ethers.utils.AbiCoder();

  beforeEach(async function () {
    [
      deployer,
      depositor,
      contract,
      user1,
      user2,
      user3,
      admin,
      master,
      ...addrs
    ] = await ethers.getSigners();

    Instance = await ethers.getContractFactory("Milk");
    Milk = (await Instance.deploy("Milk", "MILK")) as Milk;

    Instance = await ethers.getContractFactory("ItemFactory");
    ItemFactory = (await Instance.deploy(
      "some uri",
      Milk.address
    )) as ItemFactory;
  });

  describe("Admin Settings Test", function () {
    it("Should fail to set rarity rolls - (do not have ADMIN_ROLE)", async function () {
      await expect(
        ItemFactory.connect(admin).setRarityRolls(60, 80, 90, 98, 100, 100)
      ).to.be.revertedWith("AccessControl: account");
    });

    it("Should fail to set rarity rolls - (common > uncommon)", async function () {
      await ItemFactory.grantRole(ADMIN_ROLE, admin.address);
      await expect(
        ItemFactory.connect(admin).setRarityRolls(80, 60, 90, 98, 100, 100)
      ).to.be.revertedWith("Common must be less rare than uncommon");
    });

    it("Should fail to set rarity rolls - (uncommon > rare)", async function () {
      await ItemFactory.grantRole(ADMIN_ROLE, admin.address);
      await expect(
        ItemFactory.connect(admin).setRarityRolls(60, 90, 80, 98, 100, 100)
      ).to.be.revertedWith("Uncommon must be less rare than rare");
    });

    it("Should fail to set rarity rolls - (rare > epic)", async function () {
      await ItemFactory.grantRole(ADMIN_ROLE, admin.address);
      await expect(
        ItemFactory.connect(admin).setRarityRolls(60, 80, 98, 90, 100, 100)
      ).to.be.revertedWith("Rare must be less rare than epic");
    });

    it("Should fail to set rarity rolls - (epic > legendary)", async function () {
      await ItemFactory.grantRole(ADMIN_ROLE, admin.address);
      await expect(
        ItemFactory.connect(admin).setRarityRolls(60, 80, 90, 100, 98, 100)
      ).to.be.revertedWith("Epic must be less rare than legendary");
    });

    it("Should fail to set rarity rolls - (legendary > maxRoll)", async function () {
      await ItemFactory.grantRole(ADMIN_ROLE, admin.address);
      await expect(
        ItemFactory.connect(admin).setRarityRolls(60, 80, 90, 98, 101, 100)
      ).to.be.revertedWith(
        "Legendary rarity level must be less than or equal to the max rarity roll"
      );
    });

    it("Should successfully set rarity rolls", async function () {
      await ItemFactory.grantRole(ADMIN_ROLE, admin.address);
      await ItemFactory.connect(admin).setRarityRolls(1, 2, 3, 4, 5, 5);

      expect(await ItemFactory.commonRoll()).to.be.equal(1);
      expect(await ItemFactory.uncommonRoll()).to.be.equal(2);
      expect(await ItemFactory.rareRoll()).to.be.equal(3);
      expect(await ItemFactory.epicRoll()).to.be.equal(4);
      expect(await ItemFactory.legendaryRoll()).to.be.equal(5);
      expect(await ItemFactory.maxRarityRoll()).to.be.equal(5);
    });

    it("Should fail to set reward data - (do not have ADMIN_ROLE)", async function () {
      await expect(
        ItemFactory.connect(admin).setReward(
          0,
          0,
          abiCoder.encode(
            ["uint256", "uint256", "uint256[]"],
            [1, 5, [1, 2, 3, 4, 5]]
          )
        )
      ).to.be.revertedWith("AccessControl: account");
    });

    it("Should fail to set reward data - (reward type is incorrect)", async function () {
      let rewardData = abiCoder.encode(
        ["uint256", "uint256", "uint256[]"],
        [1, 5, [1, 2, 3, 4, 5]]
      );

      await expect(
        ItemFactory.connect(admin).setReward(2, 0, rewardData)
      ).to.be.revertedWith("function was called with incorrect parameters");
    });

    it("Should fail to set reward data - (reward rarity is incorrect)", async function () {
      let rewardData = abiCoder.encode(
        ["uint256", "uint256", "uint256[]"],
        [1, 5, [1, 2, 3, 4, 5]]
      );

      await expect(
        ItemFactory.connect(admin).setReward(0, 6, rewardData)
      ).to.be.revertedWith("function was called with incorrect parameters");
    });

    it("Should sucessfully set reward data - (do not have ADMIN_ROLE)", async function () {
      await ItemFactory.grantRole(ADMIN_ROLE, admin.address);

      let rewardData, data;

      for (let rewardType = 0; rewardType <= 1; rewardType++) {
        for (let rewardRarity = 0; rewardRarity <= 4; rewardRarity++) {
          rewardData = abiCoder.encode(
            ["uint256", "uint256", "uint256[]"],
            [1, 5, [1, 2, 3, 4, 5]]
          );

          await ItemFactory.connect(admin).setReward(
            rewardType,
            rewardRarity,
            rewardData
          );

          data = await ItemFactory._rewardMapping(rewardType, rewardRarity);
          expect(data).to.be.equal(rewardData);
        }
      }
    });
  });

  describe("Claim Test", function () {
    beforeEach(async function () {
      await ItemFactory.grantRole(ADMIN_ROLE, admin.address);

      let rewardData, data;

      for (let rewardType = 0; rewardType <= 1; rewardType++) {
        for (let rewardRarity = 0; rewardRarity <= 4; rewardRarity++) {
          rewardData = abiCoder.encode(
            ["uint256", "uint256", "uint256[]"],
            [1, 5, [1, 2, 3, 4, 5]]
          );

          await ItemFactory.connect(admin).setReward(
            rewardType,
            rewardRarity,
            rewardData
          );

          data = await ItemFactory._rewardMapping(rewardType, rewardRarity);
          expect(data).to.be.equal(rewardData);
        }
      }
    });

    it("Should fail to claim - (CONTRACT_ROLE not given to ItemFactory in Milk)", async function () {
      await expect(ItemFactory.claim(user1.address, 2212)).to.be.revertedWith(
        "AccessControl: account"
      );
    });

    it("Should claim", async function () {
      await Milk.grantRole(CONTRACT_ROLE, ItemFactory.address);

      await ItemFactory.claim(user1.address, 2612);

      let latestBlockNumber;
      let currentTime;

      latestBlockNumber = await ethers.provider.getBlockNumber();
      currentTime = (await ethers.provider.getBlock(latestBlockNumber))
        .timestamp;

      await network.provider.send("evm_increaseTime", [currentTime + 86400]);
      await network.provider.send("evm_mine");

      await ItemFactory.claim(user1.address, currentTime + 86400);

      latestBlockNumber = await ethers.provider.getBlockNumber();
      currentTime = (await ethers.provider.getBlock(latestBlockNumber))
        .timestamp;

      await network.provider.send("evm_increaseTime", [currentTime + 86400]);
      await network.provider.send("evm_mine");

      await ItemFactory.claim(user1.address, currentTime + 86400);
    });

    it("Should fail to claim - (Claiming more than once in a day)", async function () {
      await Milk.grantRole(CONTRACT_ROLE, ItemFactory.address);

      await ItemFactory.claim(user1.address, 2212);
      await expect(ItemFactory.claim(user1.address, 2212)).to.be.revertedWith(
        "ItemFactory: claiming more than once in a day"
      );
    });
  });
});
