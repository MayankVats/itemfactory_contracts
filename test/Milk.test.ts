import { ContractFactory } from "ethers";
import { Milk } from "../src/types/Milk";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

describe("Milk Test", function () {
  let Instance: ContractFactory;
  let Milk: Milk;

  let DEPOSITOR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("DEPOSITOR_ROLE")
  );
  let CONTRACT_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("CONTRACT_ROLE")
  );
  let MASTER_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("MASTER_ROLE")
  );

  let deployer: SignerWithAddress;
  let depositor: SignerWithAddress;
  let contract: SignerWithAddress;
  let master: SignerWithAddress;

  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let addrs: SignerWithAddress[];

  let abiCoder = new ethers.utils.AbiCoder();

  beforeEach(async function () {
    [deployer, depositor, contract, user1, user2, user3, master, ...addrs] =
      await ethers.getSigners();

    Instance = await ethers.getContractFactory("Milk");
    Milk = (await Instance.deploy("Milk", "MILK")) as Milk;
  });

  describe("Deposit Test", function () {
    it("Should fail to deposit - (do not have DEPOSITOR_ROLE)", async function () {
      await expect(
        Milk.connect(depositor).deposit(
          user1.address,
          abiCoder.encode(["uint256"], [ethers.utils.parseEther("1")])
        )
      ).to.be.revertedWith("AccessControl: account");
    });

    it("Should fail to deposit - (depositing to zero address)", async function () {
      await Milk.grantRole(DEPOSITOR_ROLE, depositor.address);

      await expect(
        Milk.connect(depositor).deposit(
          ethers.constants.AddressZero,
          abiCoder.encode(["uint256"], [ethers.utils.parseEther("1")])
        )
      ).to.be.revertedWith("ERC20: mint to the zero address");
    });

    it("Should deposit successfully - (DEPOSITOR_ROLE depositing)", async function () {
      await Milk.grantRole(DEPOSITOR_ROLE, depositor.address);

      await Milk.connect(depositor).deposit(
        user1.address,
        abiCoder.encode(["uint256"], [ethers.utils.parseEther("1")])
      );

      expect(await Milk.balanceOf(user1.address)).to.be.equal(
        ethers.utils.parseEther("1")
      );
    });
  });

  describe("Withdraw Test", function () {
    it("Should fail to withdraw - (do not have sufficient milk)", async function () {
      await expect(
        Milk.withdraw(ethers.utils.parseEther("1"))
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");

      await Milk.grantRole(DEPOSITOR_ROLE, depositor.address);

      await Milk.connect(depositor).deposit(
        user1.address,
        abiCoder.encode(["uint256"], [ethers.utils.parseEther("1")])
      );

      await expect(
        Milk.connect(user1).withdraw(ethers.utils.parseEther("2"))
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });

    it("Should successfully burn", async function () {
      await Milk.grantRole(DEPOSITOR_ROLE, depositor.address);

      await Milk.connect(depositor).deposit(
        user1.address,
        abiCoder.encode(["uint256"], [ethers.utils.parseEther("1")])
      );

      await Milk.connect(user1).withdraw(ethers.utils.parseEther("1"));

      expect(await Milk.balanceOf(user1.address)).to.be.equal(
        ethers.utils.parseEther("0")
      );
    });
  });

  describe("Game Withdraw Test", function () {
    it("Should fail to withdraw - (do not have CONTRACT_ROLE)", async function () {
      await expect(
        Milk.connect(contract).gameWithdraw(
          depositor.address,
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWith("AccessControl: account");
    });

    it("Should fail to withdraw - (owner do not have sufficient amount)", async function () {
      await Milk.grantRole(CONTRACT_ROLE, contract.address);

      await expect(
        Milk.connect(contract).gameWithdraw(
          user1.address,
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWith("ERC20: burn amount exceeds balance");
    });

    it("Should successfully withdraw", async function () {
      await Milk.grantRole(DEPOSITOR_ROLE, depositor.address);

      await Milk.connect(depositor).deposit(
        user1.address,
        abiCoder.encode(["uint256"], [ethers.utils.parseEther("1")])
      );

      await Milk.grantRole(CONTRACT_ROLE, contract.address);

      await Milk.connect(contract).gameWithdraw(
        user1.address,
        ethers.utils.parseEther("1")
      );

      expect(await Milk.balanceOf(user1.address)).to.be.equal(
        ethers.utils.parseEther("0")
      );
    });
  });

  describe("Game Transfer From", function () {
    it("Should fail to transfer - (do not have have CONTRACT_ROLE)", async function () {
      await expect(
        Milk.connect(contract).gameTransferFrom(
          user1.address,
          user2.address,
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWith("AccessControl: account");
    });

    it("Should fail to transfer - (sender is zero address)", async function () {
      await Milk.grantRole(CONTRACT_ROLE, contract.address);

      await expect(
        Milk.connect(contract).gameTransferFrom(
          ethers.constants.AddressZero,
          user2.address,
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWith("ERC20: transfer from the zero address");
    });

    it("Should fail to transfer - (recipient is zero address)", async function () {
      await Milk.grantRole(CONTRACT_ROLE, contract.address);

      await expect(
        Milk.connect(contract).gameTransferFrom(
          user1.address,
          ethers.constants.AddressZero,
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWith("ERC20: transfer to the zero address");
    });

    it("Should fail to transfer - (sender do not have sufficient balance)", async function () {
      await Milk.grantRole(CONTRACT_ROLE, contract.address);

      await expect(
        Milk.connect(contract).gameTransferFrom(
          user1.address,
          user2.address,
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should successfully transfer", async function () {
      await Milk.grantRole(DEPOSITOR_ROLE, depositor.address);

      await Milk.connect(depositor).deposit(
        user1.address,
        abiCoder.encode(["uint256"], [ethers.utils.parseEther("1")])
      );

      await Milk.grantRole(CONTRACT_ROLE, contract.address);

      await Milk.connect(contract).gameTransferFrom(
        user1.address,
        user2.address,
        ethers.utils.parseEther("1")
      );

      expect(await Milk.balanceOf(user1.address)).to.be.equal(
        ethers.utils.parseEther("0")
      );

      expect(await Milk.balanceOf(user2.address)).to.be.equal(
        ethers.utils.parseEther("1")
      );
    });
  });

  describe("Game Burn Test", function () {
    it("Should fail to burn - (do not have CONTRACT_ROLE)", async function () {
      await expect(
        Milk.connect(contract).gameBurn(
          user1.address,
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWith("AccessControl: account");
    });

    it("Should fail to burn - (owner do not have Milk tokens)", async function () {
      await Milk.grantRole(CONTRACT_ROLE, contract.address);

      await expect(
        Milk.connect(contract).gameBurn(
          user1.address,
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Should fail to burn - (owner is zero address)", async function () {
      await Milk.grantRole(CONTRACT_ROLE, contract.address);

      await expect(
        Milk.connect(contract).gameBurn(
          ethers.constants.AddressZero,
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWith("ERC20: transfer from the zero address");
    });

    it("Should successfully burn", async function () {
      await Milk.grantRole(DEPOSITOR_ROLE, depositor.address);

      await Milk.connect(depositor).deposit(
        user1.address,
        abiCoder.encode(["uint256"], [ethers.utils.parseEther("1")])
      );

      await Milk.grantRole(CONTRACT_ROLE, contract.address);

      await Milk.connect(contract).gameBurn(
        user1.address,
        ethers.utils.parseEther("1")
      );

      expect(await Milk.balanceOf(user1.address)).to.be.equal(
        ethers.utils.parseEther("0")
      );
    });
  });

  describe("Game Mint Test", function () {
    it("Should fail to mint - (do not have CONTRACT_ROLE)", async function () {
      await expect(
        Milk.connect(contract).gameMint(
          user1.address,
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWith("AccessControl: account");
    });

    it("Should fail to mint - (minting to zero address)", async function () {
      await Milk.grantRole(CONTRACT_ROLE, contract.address);

      await expect(
        Milk.connect(contract).gameMint(
          ethers.constants.AddressZero,
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWith("ERC20: mint to the zero address");
    });

    it("Should successfully Game Mint", async function () {
      await Milk.grantRole(CONTRACT_ROLE, contract.address);

      await Milk.connect(contract).gameMint(
        user1.address,
        ethers.utils.parseEther("1")
      );

      expect(await Milk.balanceOf(user1.address)).to.be.equal(
        ethers.utils.parseEther("1")
      );
    });
  });

  describe("Mint Test", function () {
    it("Should fail to mint - (do not have MASTER_ROLE)", async function () {
      await expect(
        Milk.connect(master).mint(user1.address, ethers.utils.parseEther("1"))
      ).to.be.revertedWith("AccessControl: account");
    });

    it("Should fail to mint - (minting to zero address)", async function () {
      await Milk.grantRole(MASTER_ROLE, master.address);

      await expect(
        Milk.connect(master).mint(
          ethers.constants.AddressZero,
          ethers.utils.parseEther("1")
        )
      ).to.be.revertedWith("ERC20: mint to the zero address");
    });

    it("Should successfully Mint", async function () {
      await Milk.grantRole(MASTER_ROLE, master.address);

      await Milk.connect(master).mint(
        user1.address,
        ethers.utils.parseEther("1")
      );

      expect(await Milk.balanceOf(user1.address)).to.be.equal(
        ethers.utils.parseEther("1")
      );
    });
  });
});
