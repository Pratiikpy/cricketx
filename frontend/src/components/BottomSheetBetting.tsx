import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import BettingPanel from "./BettingPanel";
import { Market } from "@/data/mockData";
import { ReactNode } from "react";

interface Props {
  market: Market;
  children: ReactNode;
}

const BottomSheetBetting = ({ market, children }: Props) => {
  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="px-4 pb-8 pt-2 max-h-[85vh]">
        <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mb-4" />
        <BettingPanel market={market} />
      </DrawerContent>
    </Drawer>
  );
};

export default BottomSheetBetting;
