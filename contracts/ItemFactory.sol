// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./common/ERC1155SupplyCC.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Milk.sol";

contract ItemFactory is ERC1155SupplyCC, AccessControl {
    event LogDailyClaim(
        address indexed claimer,
        uint256 rewardType,
        uint256 rewardRarity,
        bytes rewardData
    );

    /// @dev Track last time a claim was made for a specific pet
    mapping(uint256 => uint256) public _lastUpdate;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    address public milkContractAddress;

    /// @dev Rarity rolls
    uint16 public commonRoll = 60;
    uint16 public uncommonRoll = 80;
    uint16 public rareRoll = 90;
    uint16 public epicRoll = 98;
    uint16 public legendaryRoll = 100;
    uint16 public maxRarityRoll = 100;

    enum RewardRarity {
        COMMON,
        UNCOMMON,
        RARE,
        EPIC,
        LEGENDARY
    }

    enum RewardType {
        MILK,
        BOX
    }

    /// @dev rewardType => (rewardRarity => data)
    mapping(RewardType => mapping(RewardRarity => bytes)) public _rewardMapping;

    mapping(address => uint256) lastClaimTime;

    constructor(string memory _uri, address _milkContractAddress)
        ERC1155SupplyCC(_uri)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        milkContractAddress = _milkContractAddress;
    }

    function claim(address claimer, uint256 entropy) external {
        require(
            block.timestamp - lastClaimTime[claimer] >= 1 days,
            "ItemFactory: claiming more than once in a day"
        );

        // generate a single random number and bit shift as needed
        uint256 randomNumber = randomNum(entropy);

        // roll and pick the rarity level of the reward
        uint256 randRarity = randomNumber % legendaryRoll;
        uint256 rewardRarity;
        bytes memory rewardData;
        uint256 rewardType = uint256(RewardType.BOX);

        // pick rarity based on rarity chances
        if (randRarity < commonRoll) {
            rewardRarity = uint256(RewardRarity.COMMON);
        } else if (randRarity < uncommonRoll) {
            rewardRarity = uint256(RewardRarity.UNCOMMON);
        } else if (randRarity < rareRoll) {
            rewardRarity = uint256(RewardRarity.RARE);
        } else if (randRarity < epicRoll) {
            rewardRarity = uint256(RewardRarity.EPIC);
        } else {
            rewardRarity = uint256(RewardRarity.LEGENDARY);
        }

        // handle Legendary on its own
        // always a box
        if (rewardRarity == uint256(RewardRarity.LEGENDARY)) {
            // give the user a box
            _mint(claimer, 1, 1, "");
        }
        // handle MILK or ITEMS
        else {
            // This will pick a random number between 0 and 1 inc.
            // MILK or ITEMS.
            rewardType = randomNum(entropy) % uint256(RewardType.BOX);

            // convert the reward mapping data to min and max
            (uint256 min, uint256 max, uint256[] memory ids) = abi.decode(
                _rewardMapping[RewardType(rewardType)][
                    RewardRarity(rewardRarity)
                ],
                (uint256, uint256, uint256[])
            );

            // do some bit shifting magic to create random min max
            uint256 rewardAmount = min +
                ((randomNum(entropy)) % (max - min + 1));

            // Give a MILK reward
            if (rewardType == uint256(RewardType.MILK)) {
                Milk milk = Milk(milkContractAddress);
                milk.gameMint(claimer, rewardAmount);
                rewardData = abi.encode(rewardAmount);
            }
            // Give an item reward
            else {
                uint256 index = (randomNum(entropy)) % ids.length;
                _mint(claimer, ids[index], rewardAmount, "");
                rewardData = abi.encode(ids[index], rewardAmount);
            }
        }

        lastClaimTime[claimer] = block.timestamp;

        emit LogDailyClaim(claimer, rewardType, rewardRarity, rewardData);

        // Claims are specific to the that pet, not the claimer or a combination of claimer and pet
        _lastUpdate[rewardRarity] = block.timestamp;
    }

    function randomNum(uint entropy) internal view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encode(block.timestamp, block.difficulty, entropy)
                )
            );
    }

    /** SETTERS */

    /// @notice returns the rarity level set for each rarity, and the maximum roll
    /// @param common - rarity level of common quests
    /// @param uncommon - rarity level of uncommon quests
    /// @param rare - rarity level of rare quests
    /// @param epic - rarity level of epic quests
    /// @param legendary - rarity level of legendary quests
    /// @param maxRoll - max rarity level
    function setRarityRolls(
        uint16 common,
        uint16 uncommon,
        uint16 rare,
        uint16 epic,
        uint16 legendary,
        uint16 maxRoll
    ) external onlyRole(ADMIN_ROLE) {
        require(common < uncommon, "Common must be less rare than uncommon");
        require(uncommon < rare, "Uncommon must be less rare than rare");
        require(rare < epic, "Rare must be less rare than epic");
        require(epic < legendary, "Epic must be less rare than legendary");
        require(
            legendary < maxRoll || legendary == maxRoll,
            "Legendary rarity level must be less than or equal to the max rarity roll"
        );

        commonRoll = common;
        uncommonRoll = uncommon;
        rareRoll = rare;
        epicRoll = epic;
        legendaryRoll = legendary;
        maxRarityRoll = maxRoll;
    }

    function setReward(
        RewardType rewardType,
        RewardRarity rewardRarity,
        bytes calldata rewardData
    ) external onlyRole(ADMIN_ROLE) {
        _rewardMapping[rewardType][rewardRarity] = rewardData;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return
            interfaceId == type(ERC1155SupplyCC).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
