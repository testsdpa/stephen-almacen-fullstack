// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor() ERC20("MyToken", "MTK") Ownable(msg.sender) {
        _mint(msg.sender, 1000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function mintForSelf(uint256 amount) public {
        _mint(msg.sender, amount);
    }

    function transferTokens(address to, uint256 amount) public returns (bool) {
        return transfer(to, amount); // ✔ use OpenZeppelin's transfer
    }


    function getBalance(address account) public view returns (uint256) {
        return balanceOf(account);
    }

    function getTotalSupply() public view returns (uint256) {
        return totalSupply();
    }

    function isOwner(address account) public view returns (bool) {
        return account == owner();
    }
}
