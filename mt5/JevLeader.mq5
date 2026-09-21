#property copyright "jev-trader"
#property link      "https://github.com"
#property version   "1.00"
#property description "Posts XAUUSD ticks to the Jev gold server and executes the latest buy/sell signal."

#include <Trade/Trade.mqh>
#include "JevHttp.mqh"

input string InpServer       = "http://127.0.0.1:3001";
input string InpSymbol       = "XAUUSD";
input double InpLot          = 0.01;
input int    InpSlippage     = 30;
input long   InpMagic        = 210921;
input int    InpSLPoints     = 0;
input int    InpTPPoints     = 0;
input int    InpMaxSpreadPips = 30;
input int    InpMaxAgeMs     = 5000;
input int    InpTimeoutMs    = 2000;
input int    InpPollMs       = 200;

CTrade trade;
string g_symbol;
string g_last_action = "";
int    g_last_seq = -1;

int OnInit()
{
   g_symbol = JevResolveSymbol(InpSymbol);
   if(!SymbolSelect(g_symbol, true))
     {
      Print("JevLeader: symbol not found ", InpSymbol);
      return INIT_FAILED;
     }
   trade.SetExpertMagicNumber(InpMagic);
   trade.SetDeviationInPoints(InpSlippage);
   trade.SetTypeFillingBySymbol(g_symbol);
   if(!EventSetMillisecondTimer(InpPollMs))
     {
      Print("JevLeader: timer failed");
      return INIT_FAILED;
     }
   Print("JevLeader symbol=", g_symbol, " server=", InpServer);
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
   PostTick();
   string raw = JevHttp("GET", JevJoin(InpServer, "/signal"), "", InpTimeoutMs);
   if(raw == "")
      return;
   string action = JevJsonString(raw, "action");
   string position = JevJsonString(raw, "position");
   int seq = (int)JevJsonNumber(raw, "seq", -1);
   double ts = JevJsonNumber(raw, "ts", 0);
   bool spreadOk = JevJsonBool(raw, "spreadOk", true);
   double lot = JevJsonNumber(raw, "lot", InpLot);
   if(lot <= 0)
      lot = InpLot;

   long now_ms = (long)TimeGMT() * 1000;
   if(ts > 0 && MathAbs((double)now_ms - ts) > InpMaxAgeMs)
     {
      Print("JevLeader: stale signal age_ms=", MathAbs((double)now_ms - ts));
      return;
     }
   if(!spreadOk)
      return;
   if(JevSpreadPips(g_symbol, SymbolInfoDouble(g_symbol, SYMBOL_POINT)) > InpMaxSpreadPips)
      return;
   if(action != "buy" && action != "sell" && action != "hold")
      return;
   if(seq == g_last_seq && action == g_last_action)
      return;

   if(!ApplyPosition(position, action, lot, seq))
      return;
   g_last_seq = seq;
   g_last_action = action;
}

void PostTick()
{
   double bid = SymbolInfoDouble(g_symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(g_symbol, SYMBOL_ASK);
   long volume = SymbolInfoInteger(g_symbol, SYMBOL_VOLUME);
   string body = "{\"bid\":" + DoubleToString(bid, 5) +
                 ",\"ask\":" + DoubleToString(ask, 5) +
                 ",\"volume\":" + IntegerToString((int)volume) +
                 ",\"ts\":" + IntegerToString((long)TimeGMT() * 1000) + "}";
   JevHttp("POST", JevJoin(InpServer, "/tick"), body, InpTimeoutMs);
}

void PostFill(const ulong ticket, const string side, const double lots, const double price)
{
   string body = "{\"ticket\":" + IntegerToString((long)ticket) +
                 ",\"side\":\"" + side +
                 "\",\"lots\":" + DoubleToString(lots, 2) +
                 ",\"price\":" + DoubleToString(price, 5) +
                 ",\"symbol\":\"" + g_symbol + "\"}";
   JevHttp("POST", JevJoin(InpServer, "/fill"), body, InpTimeoutMs);
}

bool ApplyPosition(const string want, const string action, double lot, const int seq)
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
      have = 0;
     }
   if(need == 0)
      return true;

   lot = JevNormLot(g_symbol, lot, InpLot, 0);
   if(lot <= 0)
     {
      Print("JevLeader: lot rounded to 0");
      return false;
     }
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
      ok = trade.Buy(lot, g_symbol, 0, sl, tp, "jev-gold");
      if(ok)
         PostFill(trade.ResultOrder(), "buy", lot, trade.ResultPrice());
     }
   else
     {
      if(InpSLPoints > 0)
         sl = NormalizeDouble(bid + InpSLPoints * point, digits);
      if(InpTPPoints > 0)
         tp = NormalizeDouble(bid - InpTPPoints * point, digits);
      ok = trade.Sell(lot, g_symbol, 0, sl, tp, "jev-gold");
      if(ok)
         PostFill(trade.ResultOrder(), "sell", lot, trade.ResultPrice());
     }
   if(!ok)
      Print("JevLeader: send failed ", trade.ResultRetcodeDescription());
   return ok;
}
