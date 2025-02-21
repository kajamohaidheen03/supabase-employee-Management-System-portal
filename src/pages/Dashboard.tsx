import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, X, Pencil, Trash, LogOut } from "lucide-react";

type Employee = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

type Attendance = {
  id: string;
  date: string;
  status: string;
  employee_id: string;
  created_at: string;
  employees?: Employee;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    
    checkUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/auth");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*');
      
      if (error) throw error;
      return data as Employee[];
    }
  });

  const { data: attendanceData, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          employees (
            id,
            full_name,
            email,
            role
          )
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as (Attendance & { employees: Employee })[];
    }
  });

  const markAttendance = async (status: string) => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('attendance')
        .insert({
          date: selectedDate,
          status: status,
          employee_id: selectedEmployee
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({
        title: "Success",
        description: `Marked as ${status} for ${selectedDate}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      });
    }
  };

  const deleteAttendance = async (id: string) => {
    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({
        title: "Success",
        description: "Attendance record deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete attendance",
        variant: "destructive",
      });
    }
  };

  const updateAttendance = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('attendance')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({
        title: "Success",
        description: "Attendance status updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update attendance",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Employee Dashboard</h1>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Mark Attendance</h2>
          <div className="flex gap-4 items-center">
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded p-2"
            />
            <Button
              onClick={() => markAttendance('present')}
              className="bg-green-500 hover:bg-green-600"
            >
              <Check className="mr-2 h-4 w-4" />
              Mark Present
            </Button>
            <Button
              onClick={() => markAttendance('absent')}
              className="bg-red-500 hover:bg-red-600"
            >
              <X className="mr-2 h-4 w-4" />
              Mark Absent
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold p-6 border-b">Attendance Records</h2>
          {isLoadingAttendance || isLoadingEmployees ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.employees?.full_name}</TableCell>
                    <TableCell>{record.employees?.email}</TableCell>
                    <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-sm ${
                        record.status === 'present' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateAttendance(
                            record.id,
                            record.status === 'present' ? 'absent' : 'present'
                          )}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteAttendance(record.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
