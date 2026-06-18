import React from "react";
import {
  ArrowLeft as PhArrowLeft,
  ArrowRight as PhArrowRight,
  ArrowsClockwise,
  ArrowsOutSimple,
  Bank,
  BellSimple,
  Brain,
  Buildings,
  CaretRight,
  ChartBar,
  ChartDonut,
  ChartLine,
  ChartPie,
  ChatCircleText,
  CheckCircle,
  ClipboardText,
  Cloud,
  Code,
  Compass,
  CreditCard as PhCreditCard,
  Cpu,
  CurrencyInr,
  CurrencyDollar,
  Database,
  DeviceMobile,
  DownloadSimple,
  EnvelopeSimple,
  EyeSlash,
  FileCsv,
  FileMagnifyingGlass,
  FileText,
  Fingerprint,
  Gauge,
  Graph,
  HardDrive,
  InstagramLogo,
  Key,
  Leaf,
  Lightbulb,
  LinkSimple,
  LinkedinLogo,
  List,
  Lock as PhLock,
  MagnifyingGlass,
  Moon,
  PaperPlaneTilt,
  Percent,
  Pulse,
  Question,
  QrCode as PhQrCode,
  RocketLaunch,
  Shield,
  ShieldCheck,
  ShieldWarning,
  Shuffle,
  SignOut,
  SlidersHorizontal,
  Sparkle,
  Stack,
  Sun,
  Table,
  Target,
  Timer,
  Tray,
  TrendUp,
  UploadSimple,
  User,
  Warning,
  WarningCircle,
  XLogo,
  X as PhX,
  Lightning,
} from "@phosphor-icons/react";

type PhosphorIconProps = React.ComponentProps<typeof PhArrowRight>;
type PhosphorIcon = React.ComponentType<PhosphorIconProps>;

const icon = (Icon: PhosphorIcon, weight: PhosphorIconProps["weight"] = "duotone") => {
  return function ProfessionalIcon(props: PhosphorIconProps) {
    return <Icon weight={weight} {...props} />;
  };
};

export const Activity = icon(Pulse);
export const AlertCircle = icon(WarningCircle);
export const AlertTriangle = icon(Warning);
export const ArrowLeft = icon(PhArrowLeft, "bold");
export const ArrowRight = icon(PhArrowRight, "bold");
export const BarChart2 = icon(ChartBar);
export const BarChart3 = icon(ChartBar);
export const Bell = icon(BellSimple);
export const BrainCircuit = icon(Brain);
export const Building = icon(Buildings);
export const Building2 = icon(Buildings);
export const CheckCircle2 = icon(CheckCircle);
export const CheckCircleIcon = icon(CheckCircle);
export { CheckCircleIcon as CheckCircle };
export const ChevronRight = icon(CaretRight, "bold");
export const ClipboardList = icon(ClipboardText);
export const CreditCard = icon(PhCreditCard);
export const CpuIcon = icon(Cpu);
export { CpuIcon as Cpu };
export const DatabaseIcon = icon(Database);
export { DatabaseIcon as Database };
export const Download = icon(DownloadSimple);
export const DollarSign = icon(CurrencyDollar);
export const EyeOff = icon(EyeSlash);
export const FileSpreadsheet = icon(FileCsv);
export const FileSearch = icon(FileMagnifyingGlass);
export const GaugeIcon = icon(Gauge);
export { GaugeIcon as Gauge };
export const HardDriveIcon = icon(HardDrive);
export { HardDriveIcon as HardDrive };
export const HelpCircle = icon(Question);
export const Inbox = icon(Tray);
export const Landmark = icon(Bank);
export const Layers = icon(Stack);
export const LineChart = icon(ChartLine);
export const Link = icon(LinkSimple);
export const Linkedin = icon(LinkedinLogo);
export const Instagram = icon(InstagramLogo);
export const Lock = icon(PhLock);
export const LogOut = icon(SignOut);
export const Mail = icon(EnvelopeSimple);
export const Maximize2 = icon(ArrowsOutSimple);
export const Menu = icon(List, "bold");
export const MessageSquare = icon(ChatCircleText);
export const MessageSquareCode = icon(ChatCircleText);
export const Network = icon(Cloud);
export const PieChart = icon(ChartPie);
export const ChartDonutIcon = icon(ChartDonut);
export { ChartDonutIcon as ChartDonut };
export const IndianRupee = icon(CurrencyInr);
export const QrCode = icon(PhQrCode);
export const RefreshCw = icon(ArrowsClockwise);
export const Rocket = icon(RocketLaunch);
export const Search = icon(MagnifyingGlass);
export const SearchCode = icon(Code);
export const Send = icon(PaperPlaneTilt);
export const Server = icon(Cloud);
export const ShieldAlert = icon(ShieldWarning);
export const Sliders = icon(SlidersHorizontal);
export const Smartphone = icon(DeviceMobile);
export const Sparkles = icon(Sparkle);
export const SunIcon = icon(Sun);
export { SunIcon as Sun };
export const MoonIcon = icon(Moon);
export { MoonIcon as Moon };
export const TableIcon = icon(Table);
export { TableIcon as Table };
export const TrendingUp = icon(TrendUp);
export const UploadCloud = icon(UploadSimple);
export const Workflow = icon(Graph);
export const Twitter = icon(XLogo);
export const X = icon(PhX, "bold");
export const Zap = icon(Lightning);

export {
  Compass,
  FileText,
  Fingerprint,
  Key,
  Leaf,
  Lightbulb,
  Percent,
  Shield,
  ShieldCheck,
  Shuffle,
  Target,
  Timer,
  User,
};
