function Howitworks() {
  return (
    <div className="px-32 ">
      <div className="flex flex-col pb-20 py-10 justify-center border-[#ebe3e8] border-l border-r items-center">
        <div>
          <p className="bg-[#f5f5f5] font-instrument font-medium text-base px-4 py-1.5 rounded-full">
            HOW IT WORKS
          </p>
        </div>
        <p className="font-britisans font-semibold pt-3 text-[52px] max-w-[400px] text-center leading-12 ">
          From stream to
          <span className="flex gap-3">
            {" "}
            <span> token </span>
            <span className="text-[#B65FFF]">in minutes.</span>
          </span>
        </p>
        <p className="max-w-xs text-lg text-center pt-2">
          Go live, co-create with your audience, and mint safely—no code, less
          risk.
        </p>
        <div className="flex mt-10 gap-10 items-stretch">
          {/* Card 1 */}
          <div className="bg-[#f6f6f6] px-2 py-2 flex-1">
            <div className="bg-[url('/img/howitworks1.svg')] rounded-lg px-4 bg-contain bg-no-repeat bg-white h-full flex flex-col">
              <div className="py-10">
                <img
                  src="/img/sec1.svg"
                  alt="howitworks"
                  className="h-[10rem] w-full mx-auto"
                />
              </div>
              <div className="pt-6 pb-4 flex flex-col gap-0.5">
                <p className="text-lg text-[#999999]">Step 1:</p>
                <p className="text-3xl font-britisans">Go live & co-create</p>
                <p className="max-w-[280px] text-lg">
                  Run polls for name, fees, and art. Viewers vote; your pod
                  shapes the token live.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#f6f6f6] px-2 py-2 flex-1">
            <div className="bg-[url('/img/howitworks2.svg')] rounded-lg px-4 bg-contain bg-no-repeat bg-white h-full flex flex-col">
              <div className="py-10">
                <img
                  src="/img/sec2.svg"
                  alt="howitworks"
                  className="h-[10rem] w-full mx-auto"
                />
              </div>
              <div className="pt-6 pb-4 flex flex-col gap-0.5">
                <p className="text-lg text-[#999999]">Step 2:</p>
                <p className="text-3xl font-britisans">One-click safe mint</p>
                <p className="max-w-[280px] text-lg">
                  One tap to mint with LP locks and caps. Built-in checks
                  confirm before listing.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#f6f6f6] px-2 py-2 flex-1">
            <div className="px-4 bg-white rounded-lg h-full flex justify-between flex-col">
              <div className="pt-6">
                <img
                  src="/img/howitworks3.svg"
                  alt="howitworks"
                  className="h-[12rem] mx-auto bg-contain bg-no-repeat"
                />
              </div>
              <div className="pt-6 pb-4 flex flex-col gap-0.5">
                <p className="text-lg text-[#999999]">Step 3:</p>
                <p className="text-3xl font-britisans">Trade, earn, grow</p>
                <p className="max-w-[280px] text-lg">
                  Fans become holders; you earn from tips and trading. Track
                  growth in Analytics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Howitworks;
