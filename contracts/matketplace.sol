// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract NFTMatketplace is ReentrancyGuard {

	address private owner;

	constructor() {
		owner = msg.sender;
	}

	modifier onlyOwner() {
		require(owner == msg.sender, "You are not the owner!");
		_;
	}

    mapping(uint => Offer) public offersList;
    uint itemId;
	uint public fee = 1000000000000000;
	uint feeBalance;


    struct Offer {
        uint offerId;
        address nftAddress;
        uint tokenId;
        address payable seller;
        uint price;
        bool isSold;
    }

    function createOffer(uint tokenId, address nftAddress, uint price) external  {
        require(price > 0, "Price must be more then zero");

        offersList[itemId] = Offer(
            itemId,
            nftAddress,
            tokenId,
            payable(msg.sender),
            price,
            false
        );

        itemId++;

        IERC721(nftAddress).transferFrom(msg.sender, address(this), tokenId);
    }

    function buyNft(uint _id) external payable {
        require(offersList[_id].isSold == false, "Item is already sold");
        require(msg.value == offersList[_id].price + fee, "Wrong amount of funds!");

        (bool sent,) = payable(offersList[_id].seller).call{value: msg.value - fee}("");
        require(sent, "Failure!");
        IERC721(offersList[_id].nftAddress).transferFrom(address(this), msg.sender, offersList[_id].tokenId);
		feeBalance += fee;
        offersList[_id].isSold = true;

    }

	function changeFee(uint _fee) external onlyOwner {
		fee = _fee;
	}

	function withdraw(address receiver) external onlyOwner nonReentrant() {
		(bool sent,) = payable(receiver).call{value: feeBalance}("");
        require(sent, "Failure!");
		feeBalance = 0;
	}

	function getBalance() public view returns(uint) {
		return address(this).balance;
	}

	receive() external payable {}
}
