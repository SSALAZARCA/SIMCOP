/**
 * @deprecated Deprecated in Milestone 2. Replaced by unified ConsolaTraslados.
 */
import React from 'react';
import ConsolaTraslados from './ConsolaTraslados';

export default function TrasladoSoldados({ unitId, role }: { unitId?: string; role?: string }) {
  return <ConsolaTraslados unitId={unitId} role={role} initialCategory="SOLDADO" />;
}
