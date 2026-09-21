#property copyright "jev-trader"
#property link      "https://github.com"
#property version   "1.00"
#property description "Copies Jev XAUUSD signals with equity-scaled lots. Does not call the model."

#include <Trade/Trade.mqh>
#include "JevHttp.mqh"

input string InpServer         = "http://127.0.0.1:3001";
input string InpSymbol         = "XAUUSD";
input double InpLotMult        = 1.0;
input double InpLeaderEquity   = 1000;
input double InpMinLot         = 0.01;
input double InpMaxLot         = 1.0;
input int    InpSlippage       = 30;
input long   InpMagic          = 210922;
input int    InpSLPoints       = 0;
input int    InpTPPoints       = 0;
input int    InpMaxSpreadPips  = 30;
input int    InpMaxAgeMs       = 5000;
input int    InpTimeoutMs      = 2000;
input int    InpPollMs         = 200;

CTrade trade;
string g_symbol;
string g_last_action = "";
int    g_last_seq = -1;

int OnInit()
{
   g_symbol = JevResolveSymbol(InpSymbol);
   if(!SymbolSelect(g_symbol, true))
     {
      Print("JevFollower: symbol not found ", InpSymbol);
      return INIT_FAILED;
     }
   if(InpLeaderEquity <= 0)
     {
      Print("JevFollower: InpLeaderEquity must be > 0");
      return INIT_FAILED;
     }
   trade.SetExpertMagicNumber(InpMagic);
   trade.SetDeviationInPoints(InpSlippage);
   trade.SetTypeFillingBySymbol(g_symbol);
   if(!EventSetMillisecondTimer(InpPollMs))
     {
      Print("JevFollower: timer failed");
      return INIT_FAILED;
     }
   Print("JevFollower symbol=", g_symbol, " server=", InpServer);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTick()
{
}

void OnTimer()
{
   string raw = JevHttp("GET", JevJoin(InpServer, "/signal"), "", InpTimeoutMs);
   if(raw == "")
      return;
   string action = JevJsonString(raw, "action");
   string position = JevJsonString(raw, "position");
   int seq = (int)JevJsonNumber(raw, "seq", -1);
   double ts = JevJsonNumber(raw, "ts", 0);
   bool spreadOk = JevJsonBool(raw, "spreadOk", true);
   double leaderLot = JevJsonNumber(raw, "lot", 0.01);

   long now_ms = (long)TimeGMT() * 1000;
   if(ts > 0 && MathAbs((double)now_ms - ts) > InpMaxAgeMs)
      return;
   if(!spreadOk)
      return;
   if(JevSpreadPips(g_symbol, SymbolInfoDouble(g_symbol, SYMBOL_POINT)) > InpMaxSpreadPips)
      return;
   if(action != "buy" && action != "sell" && action != "hold")
      return;
   if(seq == g_last_seq && action == g_last_action)
      return;

   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double rawLot = InpLotMult * leaderLot * (equity / InpLeaderEquity);
   double lot = JevNormLot(g_symbol, rawLot, InpMinLot, InpMaxLot);
   if(position != "flat" && lot <= 0)
     {
      Print("JevFollower: scaled lot is 0 (equity=", equity, " leader=", InpLeaderEquity, ")");
      return;
     }

   if(!ApplyPosition(position, action, lot))
      return;
   g_last_seq = seq;
   g_last_action = action;
}

bool ApplyPosition(const string want, const string action, const double lot)
{
   int have = JevOurSide(g_symbol, InpMagic);
   string target = want;
   if(target != "buy" && target != "sell" && target != "flat")
     {
      if(action == "buy")
         target = "buy";
      else if(action == "sell")
         target = "sell";
      else
         return true;
     }

   int need = 0;
   if(target == "buy")
      need = 1;
   else if(target == "sell")
      need = -1;

   if(have == need)
      return true;
   if(have != 0)
     {
      if(!JevCloseOurs(trade, g_symbol, InpMagic))
         return false;
     }
   if(need == 0)
      return true;
   return OpenSide(need, lot);
}

bool OpenSide(const int need, const double lot)
{
   double point = SymbolInfoDouble(g_symbol, SYMBOL_POINT);
   int digits = (int)SymbolInfoInteger(g_symbol, SYMBOL_DIGITS);
   double bid = SymbolInfoDouble(g_symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(g_symbol, SYMBOL_ASK);
   double sl = 0;
   double tp = 0;
   bool ok = false;
   if(need > 0)
     {
      if(InpSLPoints > 0)
         sl = NormalizeDouble(ask - InpSLPoints * point, digits);
      if(InpTPPoints > 0)
         tp = NormalizeDouble(ask + InpTPPoints * point, digits);
      ok = trade.Buy(lot, g_symbol, 0, sl, tp, "jev-gold-copy");
     }
   else
     {
      if(InpSLPoints > 0)
         sl = NormalizeDouble(bid + InpSLPoints * point, digits);
      if(InpTPPoints > 0)
         tp = NormalizeDouble(bid - InpTPPoints * point, digits);
      ok = trade.Sell(lot, g_symbol, 0, sl, tp, "jev-gold-copy");
     }
   if(!ok)
      Print("JevFollower: send failed ", trade.ResultRetcodeDescription());
   return ok;
}
