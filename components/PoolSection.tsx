import { Button } from "./ui/button";

const TokenCard = ({
  tokenName,
  winProb,
  votes,
  stake,
  momentum,
  momentumColor,
}: {
  tokenName: string;
  winProb: number;
  votes: number;
  stake: number;
  momentum: number;
  momentumColor: string;
}) => (
  <div className="bg-[#fbf4ff] p-6 rounded-3xl border-2 border-dashed border-purple-300 w-full max-w-sm">
    <div className="flex flex-col gap-1">
      <p className="text-gray-400 text-sm">Token Name</p>
      <p className="text-2xl font-bold text-[#B65FFF]">{tokenName}</p>

      <div className="border-t border-dashed border-gray-300 pt-4 flex flex-col gap-2">
        <p className="font-bold text-sm">
          Win prob: <span className="font-extrabold">{winProb}%</span>
        </p>
        <p className="font-bold text-sm">
          Votes:{" "}
          <span className="font-extrabold">{votes.toLocaleString()}</span>
        </p>
        <p className="font-bold text-sm">
          Stake: <span className="font-extrabold">{stake} ETH</span>
        </p>
        <p className="font-bold text-sm">
          Momentum (5m):{" "}
          <span className={`font-extrabold ${momentumColor}`}>
            {momentum > 0 ? "+" : ""}
            {momentum}%
          </span>
        </p>
        <button className="mt-4 bg-black whitespace-nowrap text-white font-bold py-3 px-6 rounded-lg w-full hover:bg-gray-800 transition-colors duration-300 ">
          Stake on {tokenName}
        </button>
      </div>
    </div>
  </div>
);

function PoolSection() {
  return (
    <div className="px-32 pt-10">
      <div className="flex py-10 px-10 justify-between border-t border-[#ebe3e8] border-l border-r items-center">
        <div>
          <div>
            <span className="inline-block bg-[#f5f5f5] font-instrument font-medium text-base px-4 py-1.5 rounded-full">
              HOW IT WORKS
            </span>
          </div>
          <p className="font-britisans font-semibold pt-3 text-[52px] max-w-[465px] text-left leading-12 ">
            <span className="flex gap-3">
              Compete. Vote. <span className="text-[#B65FFF]">Win</span>{" "}
            </span>

            <span className="text-[#B65FFF]">the Prize Pool.</span>
          </p>
          <p className="max-w-sm text-lg text-left pt-2">
            Every day, top tokens battle in the arena. Stake, vote, and earn
            rewards.
          </p>
          <Button className="mt-4">Enter the Arena</Button>
        </div>
        <div className="flex items-center justify-center py-20 font-sans ">
          <div className="bg-gray-100 p-3">
            <div className="bg-white rounded-3xl shadow-lg p-6  w-full max-w-4xl">
              {/* Header Section */}
              <div className="flex justify-between items-center mb-3">
                <h1 className="text-xl font-bold text-gray-800">
                  Prize Pool 12.4 ETH
                </h1>
                <div className="text-right text-gray-500 flex gap-1">
                  <p>Ends in</p>
                  <p>02:35:18</p>
                </div>
              </div>

              {/* Staking Cards Section */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4 relative">
                <TokenCard
                  tokenName="WHALE"
                  winProb={61}
                  votes={1284}
                  stake={7.1}
                  momentum={12}
                  momentumColor="text-green-500"
                />

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-[#B65FFF] border-dashed rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold text-gray-500 shadow-md my-4 md:my-0">
                  Vs
                </div>

                <TokenCard
                  tokenName="ARROW"
                  winProb={39}
                  votes={796}
                  stake={5.3}
                  momentum={-6}
                  momentumColor="text-red-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PoolSection;
