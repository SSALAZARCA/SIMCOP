
import React from 'react';
import type { OperationsOrder } from '../types';
import { ORDOPCardComponent } from './ORDOPCardComponent';

interface ORDOPListProps {
  operationsOrders: OperationsOrder[];
  onSelectORDOP: (ordop: OperationsOrder) => void;
  selectedORDOP: OperationsOrder | null;
}

export const ORDOPListComponent: React.FC<ORDOPListProps> = ({ operationsOrders, onSelectORDOP, selectedORDOP }) => {
  if (operationsOrders.length === 0) {
    return <p className="text-gray-400 text-center py-10">No hay Órdenes de Operaciones disponibles.</p>;
  }

  const sortedOrders = [...operationsOrders].sort((a, b) => b.issuedTimestamp - a.issuedTimestamp);

  return (
    <div className="space-y-3">
      {sortedOrders.map(ordop => (
        <ORDOPCardComponent
          key={ordop.id}
          ordop={ordop}
          onSelectORDOP={onSelectORDOP}
          isSelected={selectedORDOP?.id === ordop.id}
        />
      ))}
    </div>
  );
};