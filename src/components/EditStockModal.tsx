import React, { useState } from "react";
import { X } from "lucide-react";
import type { Annotation, Stock } from "../types/stock";
import { formatDate } from "../lib/dates";

interface EditStockModalProps {
  stock: Stock;
  onClose: () => void;
  onSave: (updatedStock: Partial<Stock>) => void;
}

export function EditStockModal({
  stock,
  onClose,
  onSave,
}: EditStockModalProps) {
  const [price, setPrice] = useState(stock.currentPrice.toString());
  const [targetPrice, setTargetPrice] = useState(
    stock.targetPrice?.toString() || ""
  );
  const [distanceNegative, setDistanceNegative] = useState(
    stock.distanceNegative.toString()
  );
  const [distancePositive, setDistancePositive] = useState(
    stock.distancePositive.toString()
  );
  const [rentUrl, setRentUrl] = useState(stock?.rentUrl || "");
  const [annotations, setAnnotations] = useState<Annotation[]>(
    stock?.annotations || []
  );

  const [newAnnotation, setNewAnnotation] = useState("");
  const [newAnnotationType, setNewAnnotationType] =
    useState<Annotation["type"]>("info");

  const handleAddAnnotation = () => {
    if (newAnnotation.trim() === "") return;

    const now = new Date();

    const newEntry: Annotation = {
      date: now.toString(),
      text: newAnnotation,
      type: newAnnotationType,
    };

    setAnnotations((prev) => [newEntry, ...prev]);
    setNewAnnotation("");
    setNewAnnotationType("info");

    const updatedStock: Partial<Stock> = {
      ...stock,
      annotations: [newEntry, ...annotations],
    };
    onSave(updatedStock);
  };

  const handleRemoveAnnotation = (index: number) => {
    const updatedAnnotations = annotations.filter((_, i) => i !== index);
    setAnnotations(updatedAnnotations);
    const updatedStock: Partial<Stock> = {
      ...stock,
      annotations: updatedAnnotations,
    };
    onSave(updatedStock);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedStock: Partial<Stock> = {
      currentPrice: parseFloat(price),
      distanceNegative: parseFloat(distanceNegative),
      distancePositive: parseFloat(distancePositive),
      rentUrl: rentUrl.trim() ? rentUrl.trim() : null,
      annotations,
    };

    if (targetPrice) {
      updatedStock.targetPrice = parseFloat(targetPrice);
      updatedStock.upside =
        ((parseFloat(targetPrice) - parseFloat(price)) / parseFloat(price)) *
        100;
    }

    onSave(updatedStock);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold mb-4">Editar {stock.symbol}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Preço Atual
            </label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Preço Alvo
            </label>
            <input
              type="number"
              step="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Distância (-)
            </label>
            <input
              type="number"
              step="0.01"
              value={distanceNegative}
              onChange={(e) => setDistanceNegative(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Distância (+)
            </label>
            <input
              type="number"
              step="0.01"
              value={distancePositive}
              onChange={(e) => setDistancePositive(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Link de aluguéis
            </label>
            <input
              type="url"
              value={rentUrl}
              onChange={(e) => setRentUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Anotações
            </label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newAnnotation}
                  onChange={(e) => setNewAnnotation(e.target.value)}
                  placeholder="Adicionar anotação"
                  className="flex-1 rounded-md border-gray-300 shadow-sm p-2 border"
                />
                <select
                  value={newAnnotationType}
                  onChange={(e) =>
                    setNewAnnotationType(e.target.value as Annotation["type"])
                  }
                  className="rounded-md border-gray-300 shadow-sm p-2 border"
                >
                  <option value="info">Normal</option>
                  <option value="warning">Atenção</option>
                  <option value="error">Importante</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddAnnotation}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Adicionar
                </button>
              </div>
              <ul className="space-y-1">
                {annotations
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  )
                  .map((annotation, index) => (
                    <li
                      key={index}
                      className={`flex justify-between items-center p-2 rounded-md ${
                        annotation.type === "info"
                          ? "bg-blue-100"
                          : annotation.type === "warning"
                          ? "bg-yellow-100"
                          : "bg-red-100"
                      }`}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexDirection: "column",
                        }}
                      >
                        <span style={{ fontSize: "10px" }}>
                          {`Data: ${formatDate(annotation?.date?.toString())}`}
                        </span>
                        <span>{annotation.text}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAnnotation(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remover
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
