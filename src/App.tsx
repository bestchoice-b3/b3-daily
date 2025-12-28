import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteField,
} from "firebase/firestore";
import {
  PlusCircle,
  ArrowUpDownIcon,
  Eraser,
  Filter,
  ListOrdered,
} from "lucide-react";
import { db } from "./lib/firebase";
import { StockCard } from "./components/StockCard";
import type { Stock } from "./types/stock";
import { validateCPF } from "./utils/cpf";
import { fetchStockData } from "./services/stockApi";

function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stocksFiltered, setStocksFiltered] = useState<Stock[]>([]);
  const [filters, setFilters] = useState<Partial<Stock>>();
  const [newSymbol, setNewSymbol] = useState("");
  const [newTargetPrice, setNewTargetPrice] = useState("");
  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState("");

  const defaultChecklist: Stock["checklist"] = {
    insider: false,
    volume: false,
    obv: false,
    adx: false,
    margemLiquida: false,
    dividendYield: false,
    magicFormula: false,
    distanciaMedia200: false,
    upside: false,
    plAverage: false,
    rent: false,
  };

  useEffect(() => {
    const cpfLocal = localStorage.getItem("dailyb3-cpf");
    if (cpfLocal) setCpf(cpfLocal);
  }, []);

  const handleSort = (sortField: keyof Stock) => {
    const stocksSorted = stocksFiltered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "number" && typeof bValue === "number") {
        return bValue - aValue;
      } else if (typeof aValue === "string" && typeof bValue === "string") {
        const dateA = new Date(aValue);
        const dateB = new Date(bValue);

        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return dateA.getTime() - dateB.getTime();
        }

        return aValue.localeCompare(bValue);
      }

      return 0;
    });

    setStocksFiltered([...stocksSorted]);
  };

  useEffect(() => {
    if (!cpf) return;
    localStorage.setItem("dailyb3-cpf", cpf);

    const unsubscribe = onSnapshot(
      collection(db, "daily_stocks"),
      (snapshot) => {
        const stocksData = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<Stock>;
          const rawChecklist =
            data.checklist &&
            typeof data.checklist === "object" &&
            !Array.isArray(data.checklist)
              ? (data.checklist as Partial<Stock["checklist"]>)
              : {};
          const checklist = {
            ...defaultChecklist,
            ...rawChecklist,
          };

          return {
            id: docSnap.id,
            ...data,
            checklist,
            score:
              typeof data.score === "number"
                ? data.score
                : Object.values(checklist).filter(Boolean).length,
          } as Stock;
        });

        const filteredStocks = stocksData.filter((stock) => stock.cpf === cpf);

        setStocks(filteredStocks);
      }
    );

    return () => unsubscribe();
  }, [cpf]);

  const calculateScore = (checklist: Stock["checklist"]): number => {
    return Object.values(checklist).filter(Boolean).length;
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSymbol || !cpf) return;
    if (
      stocks.find(
        (item: Stock) => item.symbol.toUpperCase() === newSymbol.toUpperCase()
      )
    ) {
      alert("Empresa já cadastrada");
      return;
    }

    if (!validateCPF(cpf)) {
      setCpfError("CPF inválido");
      return;
    }
    setCpfError("");

    const targetPrice = newTargetPrice ? parseFloat(newTargetPrice) : undefined;

    const newStock: Partial<Stock> = {
      symbol: newSymbol.toUpperCase(),
      distanceNegative: -0,
      distancePositive: 0,
      targetPrice,
      currentPrice: 0,
      observerTo: "C",
      checklist: {
        insider: false,
        volume: false,
        obv: false,
        adx: false,
        margemLiquida: false,
        dividendYield: false,
        magicFormula: false,
        distanciaMedia200: false,
        upside: false,
        plAverage: false,
        rent: false,
      },
      score: 0,
      cpf,
    };

    const onLineData = await getCurrentStockData(newStock, newSymbol);

    await setDoc(doc(db, "daily_stocks", newStock.symbol), {
      ...newStock,
      ...onLineData,
    });

    setNewSymbol("");
    setNewTargetPrice("");
  };

  // useEffect(() => {
  //   fetchInsiderData("ALOS3");
  // }, []);

  const handleChecklistChange = async (
    symbol: string,
    field: keyof Stock["checklist"],
    value: boolean
  ) => {
    const stock = stocks.find((s) => s.symbol === symbol);
    if (!stock) return;

    const updatedChecklist = {
      ...stock.checklist,
      [field]: value,
    };

    const updatedStock = {
      ...stock,
      dateLastCheck: String(new Date()),
      checklist: updatedChecklist,
      score: calculateScore(updatedChecklist),
    };

    await updateDoc(doc(db, "daily_stocks", symbol), updatedStock);
  };

  const getCurrentStockData = async (
    oldStock: Partial<Stock>,
    symbol: string
  ) => {
    const stockData = await fetchStockData(symbol);
    const currentPrice = stockData?.price || 0;
    const media200 = stockData?.media200;

    const hasValidPrice = Number.isFinite(currentPrice) && currentPrice > 0;

    const averagePercent200 = hasValidPrice
      ? ((currentPrice - (media200 || 0)) * 100) / currentPrice
      : undefined;

    const upside =
      hasValidPrice && typeof oldStock.targetPrice === "number"
        ? ((oldStock.targetPrice - currentPrice) / currentPrice) * 100
        : undefined;

    return { currentPrice, media200, upside, averagePercent200 };
  };

  const handleStockUpdate = async (symbol: string, updates: Partial<Stock>) => {
    let onLineData;

    try {
      onLineData = await getCurrentStockData(updates, symbol);
    } catch (error) {
      console.log(error);
    }

    const payload: Record<string, any> = {
      ...updates,
      ...(onLineData ?? {}),
    };

    if ("rentUrl" in updates) {
      const rentUrl = (updates as any).rentUrl;
      if (rentUrl === null || rentUrl === "") {
        payload.rentUrl = deleteField();
      }
    }

    const sanitizedPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    );

    await updateDoc(doc(db, "daily_stocks", symbol), sanitizedPayload);
  };

  useEffect(() => {
    const applyFilters = () => {
      if (!filters || Object.keys(filters).length === 0) {
        setStocksFiltered(stocks);
        return;
      }

      const filtered = stocks.filter((stock) => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === undefined || value === null) return true;
          if (key === "dateLastCheck") {
            const stockDate = new Date(stock[key] || "").toLocaleDateString(
              "pt-BR"
            );
            const filterDate = new Date(String(value)).toLocaleDateString(
              "pt-BR"
            );
            return stockDate === filterDate;
          }
          return String(stock[key])
            .toLowerCase()
            .includes(String(value).toLowerCase());
        });
      });

      setStocksFiltered(filtered);
    };

    applyFilters();
  }, [filters, stocks]);

  const updateFilter = (key: keyof Stock, value: any) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [key]: value,
    }));
  };

  const refreshPrices = async () => {
    stocks.map(async (stockItem: Stock) => {
      await handleStockUpdate(stockItem.symbol, stockItem);
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Análise de Ações</h1>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <label
              htmlFor="cpf"
              className="block text-sm font-medium text-gray-700"
            >
              CPF
            </label>
            <input
              type="text"
              id="cpf"
              placeholder="Digite seu CPF"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 border"
            />
            {cpfError && (
              <p className="mt-1 text-sm text-red-600">{cpfError}</p>
            )}
          </div>

          {cpf && validateCPF(cpf) && (
            <form onSubmit={handleAddStock} className="flex gap-4">
              <input
                type="text"
                placeholder="Símbolo"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                className="flex-1 p-2 border rounded"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Preço Alvo (opcional)"
                value={newTargetPrice}
                onChange={(e) => setNewTargetPrice(e.target.value)}
                className="flex-1 p-2 border rounded"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              >
                <PlusCircle className="w-5 h-5" />
                Adicionar
              </button>
            </form>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => refreshPrices()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <ArrowUpDownIcon className="w-5 h-5" />
            Atualizar Preço
          </button>
          <button
            type="button"
            onClick={() =>
              updateFilter(
                "observerTo",
                filters?.observerTo === "C" ? "V" : "C"
              )
            }
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Filter className="w-5 h-5" />
            {`Apenas ${filters?.observerTo === "C" ? "vendas" : "compras"}`}
          </button>
          <button
            type="button"
            onClick={() => setFilters({})}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Eraser className="w-5 h-5" />
            Limpar filtros
          </button>
          <button
            type="button"
            onClick={() => handleSort("score")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <ListOrdered className="w-5 h-5" />
            Score
          </button>
          <button
            type="button"
            onClick={() => handleSort("dateLastCheck")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <ListOrdered className="w-5 h-5" />
            Data
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stocksFiltered.map((stock) => (
            <StockCard
              key={stock.symbol}
              stock={stock}
              onChecklistChange={handleChecklistChange}
              onStockUpdate={handleStockUpdate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
