import { Button } from "./ui/button";

function PoolSection() {
  return (
    <div className="px-32 pt-10">
      <div className="flex py-10 px-10 pt-16 justify-between border-t border-[#ebe3e8] border-l border-r items-center">
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
        <div className="bg-[#f6f6f6] px-2 py-2 ">
          <div className="px-4 bg-white rounded-lg h-full flex justify-between flex-col">
            <div className="pt-3">
              <p className="text-2xl font-bold font-britisans">
                Prize Pool 12.4 ETH
              </p>
            </div>
            <div className="pt-6 pb-4 flex flex-col gap-0.5">
              <p className="text-lg text-[#999999]">Token Name</p>
              <p className="max-w-[280px] text-lg">
                Fans become holders; you earn from tips and trading. Track
                growth in Analytics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PoolSection;
