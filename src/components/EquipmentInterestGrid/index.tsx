import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface EquipmentInterestOption {
  value: string;
  label: string;
}

interface EquipmentInterestGridProps {
  equipment: readonly EquipmentInterestOption[];
  interested: string[];
  usedBefore: string[];
  onInterestedChange: (next: string[]) => void;
  onUsedBeforeChange: (next: string[]) => void;
}

function toggle(list: string[], value: string, checked: boolean): string[] {
  return checked ? [...list, value] : list.filter((v) => v !== value);
}

export function EquipmentInterestGrid({
  equipment,
  interested,
  usedBefore,
  onInterestedChange,
  onUsedBeforeChange,
}: EquipmentInterestGridProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Equipment</TableHead>
          <TableHead>Interested</TableHead>
          <TableHead>Used Before</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {equipment.map((item) => (
          <TableRow key={item.value}>
            <TableCell className="whitespace-normal">{item.label}</TableCell>
            <TableCell>
              <Checkbox
                aria-label={`${item.label} - Interested`}
                checked={interested.includes(item.value)}
                onCheckedChange={(checked) =>
                  onInterestedChange(toggle(interested, item.value, !!checked))
                }
              />
            </TableCell>
            <TableCell>
              <Checkbox
                aria-label={`${item.label} - Used Before`}
                checked={usedBefore.includes(item.value)}
                onCheckedChange={(checked) =>
                  onUsedBeforeChange(toggle(usedBefore, item.value, !!checked))
                }
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
