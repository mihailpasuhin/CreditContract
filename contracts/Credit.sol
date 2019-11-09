pragma solidity 0.5.12;
import "./Ownable.sol";

contract Credit is Ownable {

    event BankAccepted(address userAddress, uint timestamp, uint requestSum, uint acceptedSum);
    event BankDeclined(address userAddress, uint timestamp);
    event UserAccepted(address userAddress, uint timestamp, uint requestSum, uint acceptedSum);
    event UserDeclined(address userAddress, uint timestamp);
    event NewRequest(address userAddress, uint timestamp, uint requestSum);
    event DelegateAdded(address userAddress, address delegateAddress);
    event DelegateDeleted(address userAddress, address delegateAddress);

    enum Status{ NOT_SET, ACCEPTED, DECLINED }

    struct Request {
        uint requestSum;
        uint acceptedSum;
        Status bankStatus;
        Status userStatus;
    }

    mapping(address=>mapping(uint => Request)) public requests;
    mapping(address=>mapping(address => bool)) public delegates;

    function () external payable {}

    function makeRequest(uint amount) public {
        require(amount > 0, "Amount is equal or less than 0");
        uint timestamp = now;
        Request memory req = Request(amount, 0, Status.NOT_SET, Status.NOT_SET);
        requests[msg.sender][timestamp] = req;
        emit NewRequest(msg.sender, timestamp, amount);
    }

    function makeDelegateRequest(address userAddress, uint amount) public {
        require(userAddress != address(0), "Address is not correct!");
        require(amount > 0, "Amount is equal or less than 0");
        require(delegates[userAddress][msg.sender], "User is not a delegate!");
        uint timestamp = now;
        Request memory req = Request(amount, 0, Status.NOT_SET, Status.NOT_SET);
        requests[userAddress][timestamp] = req;
        emit NewRequest(userAddress, timestamp, amount);
    }

    function bankAccept(address userAddress, uint timestamp, uint amount) public onlyOwner {
        require(userAddress != address(0), "Address is not correct!");
        require(timestamp > 0, "Timestamp is equal or less than 0");
        require(amount > 0, "Amount is equal or less than 0");
        require(
            requests[userAddress][timestamp].bankStatus == Status.NOT_SET &&
            amount <= requests[userAddress][timestamp].requestSum, "Bank status already is sett!");
        requests[userAddress][timestamp].bankStatus = Status.ACCEPTED;
        requests[userAddress][timestamp].acceptedSum = amount;
        emit BankAccepted(userAddress, timestamp, requests[userAddress][timestamp].requestSum, amount);
    }

    function bankDecline(address userAddress, uint timestamp) public onlyOwner {
        require(userAddress != address(0), "Address is not correct!");
        require(timestamp > 0, "Timestamp is equal or less than 0");
        require(requests[userAddress][timestamp].bankStatus == Status.NOT_SET, "Bank status already is set!");
        requests[userAddress][timestamp].bankStatus = Status.DECLINED;
        emit BankDeclined(userAddress, timestamp);
    }

    function userAccept(uint timestamp) public {
        require(timestamp > 0, "Timestamp is equal or less than 0");
        require(
            requests[msg.sender][timestamp].bankStatus == Status.ACCEPTED &&
            requests[msg.sender][timestamp].userStatus == Status.NOT_SET,
            "User status already is set or bank declined!");
        requests[msg.sender][timestamp].userStatus = Status.ACCEPTED;
        msg.sender.transfer(requests[msg.sender][timestamp].acceptedSum);
        emit UserAccepted(
            msg.sender, timestamp, requests[msg.sender][timestamp].requestSum,
            requests[msg.sender][timestamp].acceptedSum);
    }

    function userDelegateAccept(address payable userAddress, uint timestamp) public {
        require(userAddress != address(0), "Address is not correct!");
        require(timestamp > 0, "Timestamp is equal or less than 0");
        require(delegates[userAddress][msg.sender], "User is not a delegate!");
        require(
            requests[userAddress][timestamp].bankStatus == Status.ACCEPTED &&
            requests[userAddress][timestamp].userStatus == Status.NOT_SET,
            "User status already is set or bank declined!");
        requests[userAddress][timestamp].userStatus = Status.ACCEPTED;
        userAddress.transfer(requests[userAddress][timestamp].acceptedSum);
        emit UserAccepted(
            userAddress, timestamp, requests[userAddress][timestamp].requestSum,
            requests[userAddress][timestamp].acceptedSum);
    }

    function userDecline(uint timestamp) public {
        require(timestamp > 0, "Timestamp is equal or less than 0");
        require(
            requests[msg.sender][timestamp].bankStatus == Status.ACCEPTED &&
            requests[msg.sender][timestamp].userStatus == Status.NOT_SET,
            "User status already is set or bank declined!");
        requests[msg.sender][timestamp].userStatus = Status.DECLINED;
        emit UserDeclined(msg.sender, timestamp);
    }

    function userDelegateDecline(address payable userAddress, uint timestamp) public {
        require(userAddress != address(0), "Address is not correct!");
        require(timestamp > 0, "Timestamp is equal or less than 0");
        require(delegates[userAddress][msg.sender], "User is not a delegate!");
        require(
            requests[userAddress][timestamp].bankStatus == Status.ACCEPTED &&
            requests[userAddress][timestamp].userStatus == Status.NOT_SET,
            "User status already is set or bank declined!");
        requests[userAddress][timestamp].userStatus = Status.DECLINED;
        emit UserDeclined(userAddress, timestamp);
    }

    function addUserDelegate(address delegate) public {
        require(delegate != address(0), "Address is not correct!");
        delegates[msg.sender][delegate] = true;
        emit DelegateAdded(msg.sender, delegate);
    }

    function deleteUserDelegate(address delegate) public {
        require(delegate != address(0), "Address is not correct!");
        delegates[msg.sender][delegate] = false;
        emit DelegateDeleted(msg.sender, delegate);
    }

}