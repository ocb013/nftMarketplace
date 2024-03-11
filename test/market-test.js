const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { expect } = require("chai")
const { ethers, upgrades } = require("hardhat")

describe("Marketplace", function () {
	let deployer, acc2
	let marketplaceAddress
	let nftAddress
	let nft
	let marketplace
	let listPrice = ethers.parseEther("0.01", "ether")
	let fee

	async function deployProxy() {
        const NFTMatketplace = await ethers.getContractFactory("NFTMatketplace")
        marketplace = await upgrades.deployProxy(NFTMatketplace, [], {
            initializer: 'initialize'
        })

        await marketplace.waitForDeployment();
    }

	beforeEach(async function () {
		;[deployer, acc2] = await ethers.getSigners()

		await loadFixture(deployProxy);
		marketplaceAddress = await marketplace.getAddress()

		const NFT = await ethers.getContractFactory("NFT")
		nft = await NFT.deploy()
		await nft.waitForDeployment()
		nftAddress = await nft.getAddress()
		fee = await marketplace.fee()
	})

	it("Should upgrade contract with saved data", async function() {
		await marketplace.changeFee(2000000000000000)
		const NFTMatketplaceV2 = await ethers.getContractFactory("NFTMatketplaceV2")
		const marketplaceV2 = await upgrades.upgradeProxy(marketplaceAddress, NFTMatketplaceV2)
		fee = await marketplaceV2.fee()
		expect(fee).to.equal(2000000000000000)
		await marketplaceV2.changeOwner(acc2.address)
		let newOwner = await marketplaceV2.connect(acc2).checkOwner()
		expect(newOwner).to.be.equal(acc2.address)

	})

	it("Should allow to change fee and only owner can change it", async function () {
		expect(fee).to.equal(1000000000000000)
		await marketplace.changeFee(2000000000000000)
		fee = await marketplace.fee()
		expect(fee).to.equal(2000000000000000)
		await expect(
			marketplace
				.connect(acc2)
				.changeFee(2000000000000000)
		).to.be.revertedWith("You are not the owner!")
	})

	it("Should be possible to sell NFT", async function () {
		await nft.safeMint(deployer.address, "META_DATA_URI")
		await nft.approve(marketplaceAddress, 0)
		await marketplace.createOffer(0, nftAddress, listPrice)
	})

	it("Should allow to buy NFT", async function () {
		await nft.safeMint(deployer.address, "META_DATA_URI")
		await nft.approve(marketplaceAddress, 0)
		await marketplace.createOffer(0, nftAddress, listPrice)

		await expect(
			await marketplace.connect(acc2).buyNft(0, { value: listPrice + fee })
		)

		item = await marketplace.offersList(0)

		expect(item.isSold).to.equal(true)
	})

	it("Should revert if wrong amount", async function () {
		await nft.safeMint(deployer.address, "META_DATA_URI")
		await nft.approve(marketplaceAddress, 0)
		await marketplace.createOffer(0, nftAddress, listPrice)

		await expect(
			marketplace
				.connect(acc2)
				.buyNft(0, { value: ethers.parseEther("0.02", "ether") })
		).to.be.revertedWith("Wrong amount of funds!")

		item = await marketplace.offersList(0)
		expect(item.isSold).to.equal(false)
	})

	it("Should not allow to buy already solded NFT", async function () {
		await nft.safeMint(deployer.address, "META_DATA_URI")
		await nft.approve(marketplaceAddress, 0)
		await marketplace.createOffer(0, nftAddress, listPrice)

		await expect(
			await marketplace.connect(acc2).buyNft(0, { value: listPrice + fee })
		)

		item = await marketplace.offersList(0)

		expect(item.isSold).to.equal(true)

		await expect(
			marketplace
				.connect(acc2)
				.buyNft(0, { value: ethers.parseEther("0.01", "ether") })
		).to.be.revertedWith("Item is already sold")
	})

	it("Should allow to widthdraw funds", async function () {
		await nft.safeMint(deployer.address, "META_DATA_URI")
		await nft.approve(marketplaceAddress, 0)
		await marketplace.createOffer(0, nftAddress, listPrice)

		await expect(
			await marketplace.connect(acc2).buyNft(0, { value: listPrice + fee })
		)
		await expect(() =>
			marketplace.withdraw(deployer.address)
		).to.changeEtherBalances(
			[marketplace, deployer],
			[-1000000000000000, 1000000000000000]
		)
	})
})