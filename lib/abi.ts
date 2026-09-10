/**
 * ABIs, hand written rather than imported from build artefacts so the website has no build time
 * dependency on the contracts repo. Each one is the minimum surface the app actually calls.
 */

export const registryAbi = [
  {
    type: "function",
    name: "scheduleExpiry",
    stateMutability: "payable",
    inputs: [
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
      { name: "expiresAt", type: "uint256" },
      { name: "permitDeadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [{ name: "jobId", type: "uint256" }],
  },
  {
    type: "function",
    name: "execute",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "cancel",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getJob",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "v", type: "uint8" },
          { name: "executed", type: "bool" },
          { name: "cancelled", type: "bool" },
          { name: "token", type: "address" },
          { name: "spender", type: "address" },
          { name: "expiresAt", type: "uint256" },
          { name: "permitDeadline", type: "uint256" },
          { name: "r", type: "bytes32" },
          { name: "s", type: "bytes32" },
          { name: "bounty", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "isExecutable",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "nextJobId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "ScheduleCreated",
    inputs: [
      { name: "jobId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "spender", type: "address", indexed: false },
      { name: "expiresAt", type: "uint256", indexed: false },
      { name: "permitDeadline", type: "uint256", indexed: false },
      { name: "bounty", type: "uint256", indexed: false },
    ],
  },
] as const;

export const lensAbi = [
  {
    type: "function",
    name: "probePermit",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [
      { name: "permitLikely", type: "bool" },
      { name: "nonce", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "tryAllowance",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [
      { name: "ok", type: "bool" },
      { name: "value", type: "uint256" },
    ],
  },
] as const;

/** Just enough ERC 20 to read metadata and the EIP 2612 domain. */
export const erc20Abi = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "nonces",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "DOMAIN_SEPARATOR",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "version",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
] as const;
