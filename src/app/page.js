import InventoryManagement from './inventoryManagement';

export const metadata = {
  title: 'Inventory Management',
  description: 'Keep track of your inventory with a personalized list that you can add, edit, delete, and search for your favorite items!',
};

export default function Home() {
  return <InventoryManagement />;
}