// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ReceiptAnchor {
    error ReceiptRootAlreadyAnchored(bytes32 receiptRoot);

    event ReceiptAnchored(bytes32 indexed receiptRoot, string metadataURI, address indexed publisher);

    mapping(bytes32 => bool) public anchored;

    function anchorReceipt(bytes32 receiptRoot, string calldata metadataURI) external {
        if (anchored[receiptRoot]) {
            revert ReceiptRootAlreadyAnchored(receiptRoot);
        }

        anchored[receiptRoot] = true;
        emit ReceiptAnchored(receiptRoot, metadataURI, msg.sender);
    }
}
